# Architecture

Internals, API, and advanced patterns. For quick start, see [README.md](./README.md).

---

- [Entity Identity](#entity-identity)
- [Versioning & Conflicts](#versioning--conflicts)
- [StateHandler](#statehandler)
- [Sanitization](#sanitization)
- [Data Flow](#data-flow)
- [Custom Handlers](#custom-handlers)
- [TRAILING Mode](#trailing-mode)
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

Your reducer receives a `BoundStateHandler` — the handler closed over current state:

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

## Custom Handlers

`indexedStateFactory` covers `Record<string, T>`. For other shapes, implement `StateHandler`:

<details>
<summary><b>Example: single-entity state</b></summary>

```typescript
import type { StateHandler } from '@lostsolution/optimistron';
import { OptimisticMergeResult } from '@lostsolution/optimistron';

type Profile = { name: string; bio: string; revision: number };

const profileHandler: StateHandler<
    Profile | null, [profile: Profile], [partial: Partial<Profile>], []
> = {
    create: (_state, profile) => profile,
    update: (state, partial) => state ? { ...state, ...partial } : state,
    remove: () => null,
    merge: (current, incoming) => {
        if (current === null && incoming === null) throw OptimisticMergeResult.SKIP;
        if (current === null || incoming === null) return incoming;
        if (incoming.revision < current.revision) throw OptimisticMergeResult.CONFLICT;
        if (incoming.revision === current.revision) {
            if (incoming.name === current.name && incoming.bio === current.bio) throw OptimisticMergeResult.SKIP;
            throw OptimisticMergeResult.CONFLICT;
        }
        return incoming;
    },
};
```

</details>

**The contract:**
1. `update`/`remove` → same reference on no-op
2. `merge` → throw `SKIP` on redundant, `CONFLICT` on stale, return merged on valid

---

## TRAILING Mode

`DedupeMode.TRAILING` — undo-on-failure for destructive ops:

```typescript
const crud = crudPrepare<Todo>('id');
const deleteTodo = createTransitions('todos::delete', DedupeMode.TRAILING)(crud.remove);

dispatch(deleteTodo.stage(id));   // gone from UI (transitionId auto-detected)
dispatch(deleteTodo.stash(id));   // back — restored from trailing
```

Replaced transitions are stored as fallback. `stash` restores instead of dropping.

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

### `optimistron(namespace, initialState, handler, reducer, options?)`

Returns `{ reducer, selectOptimistic }`.

| Param | Type | Description |
|-------|------|-------------|
| `namespace` | `string` | Action type prefix |
| `initialState` | `S` | Initial state |
| `handler` | `StateHandler` | State handler implementation |
| `reducer` | `HandlerReducer` | Receives `BoundStateHandler` + action |
| `options.sanitizeAction` | `(action) => action` | Optional action transform |

### `selectOptimistic(selector)`

Returned from `optimistron()`. Replays transitions before selecting. Memoize with `createSelector`.

```typescript
selectOptimistic((todos) => Object.values(todos.state))
```

### `crudPrepare(itemIdKey)`

Factory for CRUD prepare functions that couple `transitionId === entityId`. Recommended default for indexed state.

```typescript
const crud = crudPrepare<Todo>('id');
// crud.create(item) → { payload: { item }, transitionId: item.id }
// crud.update(id, partial) → { payload: { id, item: partial }, transitionId: id }
// crud.remove(id) → { payload: { id }, transitionId: id }
```

### `createTransitions(type, dedupe?)(prepare)`

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

### `indexedStateFactory(options)`

| Option | Type | Description |
|--------|------|-------------|
| `itemIdKey` | `keyof T` | Record key field |
| `compare` | `(a: T) => (b: T) => 0 \| 1 \| -1` | Version ordering |
| `eq` | `(a: T) => (b: T) => boolean` | Content equality |

### Enums

```typescript
Operation.STAGE | .AMEND | .COMMIT | .STASH | .FAIL
DedupeMode.OVERWRITE | .TRAILING
OptimisticMergeResult.SKIP | .CONFLICT
```
