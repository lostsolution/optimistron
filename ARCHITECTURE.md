# Architecture

Internals, API, and advanced patterns. For quick start, see [README.md](./README.md).

---

- [Entity Identity](#entity-identity)
- [Versioning & Conflicts](#versioning--conflicts)
- [StateHandler](#statehandler)
- [Sanitization](#sanitization)
- [Data Flow](#data-flow)
- [Custom Handlers](#custom-handlers)
- [Transition Modes](#transition-modes)
- [Async Patterns](#async-patterns)
- [API Reference](#api-reference)

---

## Entity Identity

Every transition carries a string ID — the **stable link between a transition and its entity in state**. One ID, one entity. Because:

- **Sanitization** replays by ID — shared IDs cause shadowing
- **Selectors** look up by ID — ambiguous IDs break lookups
- **Dedupe** matches on ID

**The recommended default is `transitionId === entityId`.** Use `crudPrepare` to couple them:

```typescript
const crud = crudPrepare<Todo>('id');
const createTodo = createTransitions('todos::add')(crud.create);

dispatch(createTodo.stage(todo));           // transitionId auto-detected from todo.id
dispatch(createTodo.amend(tid, amended));   // explicit — targets original transition
dispatch(createTodo.commit(tid));           // explicit
```

**Why STAGE-only auto-detection:** `stage` initiates a new transition — the entity *is* the transition. But `amend`/`commit`/`fail`/`stash` target an *existing* transition the consumer already holds a reference to. Auto-detecting on `amend` is a pitfall: it shares `stagePA`, so an amended entity with a server-assigned ID would target the wrong transition.

For edge-cases where `transitionId !== entityId` (batch ops, correlation IDs, server-assigned IDs with temp tokens), write custom prepare functions and pass transitionId as the first argument — the explicit path works for all operations including `stage`.

---

## Versioning & Conflicts

Conflict detection needs **version ordering**. Entities carry a monotonically increasing value — `revision`, `updatedAt`, sequence number.

```typescript
compare: (a: T) => (b: T) => 0 | 1 | -1  // version ordering
eq:      (a: T) => (b: T) => boolean       // content equality at same version
```

During sanitization, `merge` runs `compare` per entity:

| `compare` | Then | Outcome |
|-----------|------|---------|
| `1` (newer) | — | Valid update |
| `0` (same) | `eq` → `true` | Skip (no-op) |
| `0` (same) | `eq` → `false` | **Conflict** |
| `-1` (older) | — | **Conflict** |

Thrown as `OptimisticMergeResult.CONFLICT` / `.SKIP`, caught by `sanitizeTransitions`.

Without versioning, conflict detection degrades to content equality — missing concurrent mutations from other clients.

---

## StateHandler

```typescript
interface StateHandler<State, CreateParams, UpdateParams, DeleteParams> {
    create: (state: State, ...args: CreateParams) => State;
    update: (state: State, ...args: UpdateParams) => State;
    remove: (state: State, ...args: DeleteParams) => State;
    merge:  (current: State, incoming: State) => State;
}
```

**Key invariant:** `update`/`remove` return the **same reference** on no-op. Sanitization uses `===` to detect effect.

### Auto-wired CRUD

Built-in handlers (`recordState`, `nestedRecordState`, `singularState`) expose a typed `wire` method as a structural extension — it is **not on the `StateHandler` interface** because each handler needs specifically typed `CrudActionMap<CP, UP, RP>` payloads. The `wire` method uses `ActionMatcher<P>` type guards to narrow action payloads without `as any` casts. When the consumer passes a CRUD action map instead of a function, `wire` handles the dispatch:

```typescript
// Zero boilerplate — handler.wire does the routing
optimistron('todos', initial, handler, {
    create: createTodo, update: editTodo, remove: deleteTodo,
});

// Hybrid — auto-wire CRUD + fallback for custom actions
optimistron('todos', initial, handler, {
    create: createTodo, update: editTodo, remove: deleteTodo,
    reducer: ({ getState }, action) => { /* custom logic */ },
});
```

The `wire` method is handler-specific because each handler needs typed payload shapes. `optimistron()` uses function overloads — the auto-wire overload infers the CRUD map type `A` from `WireMethod<A>` on the handler, enforcing that each action matcher produces the right payload shape at compile time:

| Handler | `wire` unpacks payload as |
|---------|--------------------------|
| `recordState` | `create(item)`, `update(id, item)`, `remove(id)` |
| `nestedRecordState` | `create(item)`, `update(...path, item)`, `remove(...path)` |
| `singularState` | `create(item)`, `update(item)`, `remove()` |
| `listState` | `create(item)`, `update(id, item)`, `remove(id)` |

### Manual mode

Pass a function for full control — the `BoundStateHandler` is the handler closed over current state:

```typescript
({ getState, create, update, remove }, action) => {
    if (createTodo.match(action)) return create(action.payload.todo);
    if (editTodo.match(action))   return update(action.payload.id, action.payload.todo);
    if (deleteTodo.match(action)) return remove(action.payload.id);
    return getState();
}
```

---

## Sanitization

After every state mutation, `sanitizeTransitions` replays pending transitions against committed state.

<p align="center">
  <img src=".github/sanitization.svg" alt="Sanitization Flow" width="100%"/>
</p>

For each transition: apply as-if-committed, check if state mutated, then `merge` to validate. Results: **keep**, **discard** (no-op/skip), or **flag** (conflict). Gated by `!==` — only runs when state actually changed.

---

## Data Flow

<p align="center">
  <img src=".github/dataflow.svg" alt="Data Flow" width="100%"/>
</p>

---

## Built-in State Handlers

Four built-in handlers cover the common state shapes:

### `recordState<T>` — flat key-value map

`Record<string, T>` indexed by a single key. Depth-1 specialization of `nestedRecordState`.

```typescript
import { recordState, crudPrepare } from '@lostsolution/optimistron';
const handler = recordState<Todo>({ key: 'id', compare, eq });
const crud = crudPrepare<Todo>('id');
```

### `singularState<T>` — single object

`T | null` for singletons (profile, settings). CRUD operates on the whole object.

```typescript
import { singularState } from '@lostsolution/optimistron';
const handler = singularState<Profile>({ compare, eq });
```

### `nestedRecordState<T>()` — nested records

`Record<string, Record<string, ... T>>` for multi-level grouping. Curried: fix `T`, infer keys. Multi-key `crudPrepare` joins path IDs with `/` for the transitionId.

```typescript
import { nestedRecordState, crudPrepare } from '@lostsolution/optimistron';
const handler = nestedRecordState<ProjectTodo>()({ keys: ['projectId', 'id'], compare, eq });
const crud = crudPrepare<ProjectTodo>()(['projectId', 'id']);
```

### `listState<T>` — ordered list

`T[]` for collections where insertion order matters. Items identified by a single key on `T`.

```typescript
import { listState, crudPrepare } from '@lostsolution/optimistron';
const handler = listState<Todo>({ key: 'id', compare, eq });
const crud = crudPrepare<Todo>('id');
```

## Custom Handlers

For shapes not covered by the built-ins, implement `StateHandler` directly.

**The contract:**
1. `update`/`remove` → same reference on no-op
2. `merge` → throw `SKIP` on redundant, `CONFLICT` on stale, return merged on valid

---

## Transition Modes

`TransitionMode` controls re-staging and failure behavior per action type:

| Mode | On re-stage | On fail | Use case |
|------|-------------|---------|----------|
| `DEFAULT` | Overwrite | Flag as failed | Edits |
| `DISPOSABLE` | Overwrite | Drop transition | Creates |
| `REVERTIBLE` | Store trailing | Stash (revert) | Deletes |

```typescript
const createTodo  = createTransitions('todos::add', TransitionMode.DISPOSABLE)(crud.create);
const editTodo    = createTransitions('todos::edit')(crud.update);
const deleteTodo  = createTransitions('todos::delete', TransitionMode.REVERTIBLE)(crud.remove);
```

`REVERTIBLE` stores the replaced transition as a trailing fallback. On fail or explicit stash, the previous transition is restored.

---

## Async Patterns

Transport-agnostic. Works with anything:

<details>
<summary><b>Component-level</b></summary>

```typescript
const handleCreate = async (todo: Todo) => {
  const transitionId = todo.id;
  dispatch(createTodo.stage(todo));                             // auto-detect transitionId
  try {
    await api.create(todo);
    dispatch(createTodo.amend(transitionId, { ...todo, id: serverId })); // explicit
    dispatch(createTodo.commit(transitionId));
  } catch (e) {
    dispatch(createTodo.fail(transitionId, e));
  }
};
```

</details>

<details>
<summary><b>Thunks</b></summary>

```typescript
const createTodoThunk =
  (todo: Todo): ThunkAction<void, RootState, void, Action> =>
  async (dispatch) => {
    const transitionId = todo.id;
    dispatch(createTodo.stage(todo));
    try {
      await api.create(todo);
      dispatch(createTodo.amend(transitionId, { ...todo, id: serverId }));
      dispatch(createTodo.commit(transitionId));
    } catch (e) {
      dispatch(createTodo.fail(transitionId, e));
    }
  };
```

</details>

<details>
<summary><b>Sagas</b></summary>

```typescript
function* createTodoSaga(action: ReturnType<typeof createTodo.stage>) {
  const transitionId = getTransitionMeta(action).id;
  try {
    yield call(api.create, action.payload.item);
    yield put(createTodo.amend(transitionId, { ...action.payload.item, id: serverId }));
    yield put(createTodo.commit(transitionId));
  } catch (e) {
    yield put(createTodo.fail(transitionId, e));
  }
}
```

</details>

---

## API Reference

### `optimistron(namespace, initialState, handler, config, options?)`

Returns `{ reducer, selectOptimistic }`.

| Param | Type | Description |
|-------|------|-------------|
| `namespace` | `string` | Action type prefix |
| `initialState` | `S` | Initial state |
| `handler` | `StateHandler` | State handler implementation |
| `config` | `ReducerConfig` | CRUD action map (auto-wired) or function (manual) |
| `options.sanitizeAction` | `(action) => action` | Optional action transform |

### `selectOptimistic(selector)`

Returned from `optimistron()`. Replays transitions before selecting. Memoize with `createSelector`.

```typescript
selectOptimistic((todos) => Object.values(todos.state))
```

### `crudPrepare<T>(key)` / `crudPrepare<T>()(keys)`

Factory for CRUD prepare functions that couple `transitionId === entityId`.

```typescript
// Single-key (recordState):
const crud = crudPrepare<Todo>('id');
// crud.create(item) → { payload: { item }, transitionId: item.id }
// crud.update(id, partial) → { payload: { id, item: partial }, transitionId: id }
// crud.remove(id) → { payload: { id }, transitionId: id }

// Multi-key (nestedRecordState) — curried for key inference:
const crud = crudPrepare<ProjectTodo>()(['projectId', 'id']);
// crud.create(item) → { payload: { item }, transitionId: "projectId/id" }
// crud.update(projectId, id, partial) → { payload: { path, item }, transitionId: "projectId/id" }
// crud.remove(projectId, id) → { payload: { path }, transitionId: "projectId/id" }
```

### `retryTransition(action)`

Strips `failed` and `conflict` flags from a `StagedAction`, returning a clean action ready for re-dispatch.

### `createTransitions(type, mode?)(prepare)`

Creates `.stage`, `.amend`, `.commit`, `.fail`, `.stash`, `.match`.

`stage` auto-detects `transitionId` when prepare returns it (e.g. via `crudPrepare`). All other operations require explicit `transitionId` as first argument. Per-operation preparators supported:

```typescript
createTransitions('todos::add')({
  stage: (item: Todo) => ({ payload: { item }, transitionId: item.id }),
  commit: () => ({ payload: {} }),
});
```

### Selectors

| Selector | Returns |
|----------|---------|
| `selectIsOptimistic(id)` | `boolean` — pending |
| `selectIsFailed(id)` | `boolean` — failed |
| `selectIsConflicting(id)` | `boolean` — conflicting |
| `selectFailedTransition(id)` | `StagedAction \| undefined` |
| `selectConflictingTransition(id)` | `StagedAction \| undefined` |
| `selectFailedTransitions` | `StagedAction[]` |
| `selectAllFailedTransitions(...states)` | `StagedAction[]` — aggregated across slices |
| `selectRetryCount(id)` | `number` — retry count (0 if none) |

### State Handler Factories

| Factory | Options | State shape |
|---------|---------|-------------|
| `recordState<T>` | `{ key, compare, eq }` | `Record<string, T>` |
| `singularState<T>` | `{ compare, eq }` | `T \| null` |
| `nestedRecordState<T>()(opts)` | `{ keys, compare, eq }` | Nested records |
| `listState<T>` | `{ key, compare, eq }` | `T[]` |

### Enums

```typescript
Operation.STAGE | .AMEND | .COMMIT | .STASH | .FAIL
TransitionMode.DEFAULT | .DISPOSABLE | .REVERTIBLE
OptimisticMergeResult.SKIP | .CONFLICT
```
