<p align="center">
  <img src=".github/banner.svg" alt="Optimistron" width="850"/>
</p>

<p align="center">
  <a href="https://redux.js.org/"><img src="https://img.shields.io/badge/redux-%5E5.0.1-764ABC?logo=redux&logoColor=white" alt="Redux ^5.0.1"/></a>
  <a href="https://redux-toolkit.js.org/"><img src="https://img.shields.io/badge/RTK-%5E2.11.2-764ABC?logo=redux&logoColor=white" alt="Redux Toolkit ^2.11.2"/></a>
</p>

> Optimistic state management for Redux. Optimistic state is derived at the selector level by replaying transitions on top of committed state, similar to `git rebase`.

---

## Why Optimistron?

Optimistron tracks lightweight **transitions** (stage, amend, commit, fail) alongside your reducer state and replays them at read-time through `selectOptimistic`. No state snapshots or checkpoints are stored per operation.

Optimistron was designed around an **event-driven saga architecture** — components dispatch intent via `stage`, and sagas (or listener middleware) orchestrate the transition lifecycle. It can be used with thunks or direct component dispatches, but the separation between intent and orchestration is where it fits most naturally.

Designed for:

- **Offline-first** — transitions queue up while disconnected, conflicts resolve on reconnect
- **Large/normalized state** — state is derived, not copied

---

## The Mental Model

Think of each `optimistron()` reducer as a **git branch**:

| Git            | Optimistron                                                          |
| -------------- | -------------------------------------------------------------------- |
| Branch tip     | **Committed state** — only `COMMIT` advances it                      |
| Staged commits | **Transitions** — pending changes on top of committed state          |
| `git rebase`   | **`selectOptimistic`** — replays transitions at read-time            |
| Merge conflict | **Sanitization** — detects no-ops and conflicts after every mutation |

`STAGE`, `AMEND`, `FAIL`, `STASH` never touch reducer state — they only modify the transitions list. The optimistic view updates because `selectOptimistic` re-derives on the next read.

There are no separate `isLoading` / `error` / `isOptimistic` flags — a pending transition represents the loading state, and a failed transition carries the error.

---

## Transition Lifecycle

<p align="center">
  <img src=".github/lifecycle.svg" alt="Transition Lifecycle" width="850"/>
</p>

---

## Install

```bash
npm install @lostsolution/optimistron
# ⚠️ not published yet
```

---

## Quick Start

```typescript
import { configureStore, createSelector } from '@reduxjs/toolkit';
import { optimistron, createTransitions, crudPrepare, recordState, TransitionMode } from '@lostsolution/optimistron';

// 1. Define your entity
type Todo = { id: string; value: string; done: boolean; revision: number };

// 2. Create CRUD prepare functions (couples transitionId === entityId)
const crud = crudPrepare<Todo>('id');

// 3. Create transition action creators
const createTodo = createTransitions('todos::add', TransitionMode.DISPOSABLE)(crud.create);
const editTodo = createTransitions('todos::edit')(crud.update); // DEFAULT mode
const deleteTodo = createTransitions('todos::delete', TransitionMode.REVERTIBLE)(crud.remove);

// 4. Create the optimistic reducer
const { reducer: todos, selectOptimistic } = optimistron(
    'todos',
    {} as Record<string, Todo>,
    recordState<Todo>({
        key: 'id',
        compare: (a) => (b) => (a.revision === b.revision ? 0 : a.revision > b.revision ? 1 : -1),
        eq: (a) => (b) => a.done === b.done && a.value === b.value,
    }),
    { create: createTodo, update: editTodo, remove: deleteTodo },
);

// 5. Wire up the store
const store = configureStore({ reducer: { todos } });

// 6. Select optimistic state (memoize with createSelector)
const selectTodos = createSelector(
    (state: RootState) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);

// 7. Dispatch transitions
dispatch(createTodo.stage(todo)); // optimistic — shows immediately
dispatch(createTodo.commit(todo.id)); // server confirmed — becomes committed state
dispatch(createTodo.fail(todo.id, error)); // server rejected — flagged as failed
```

---

## Three Rules

1. **One ID, one entity** — each transition ID maps to exactly one entity
2. **One at a time** — don't stage a new transition while one is already pending for the same ID
3. **One operation per transition** — a single create, update, or delete

---

## Versioning

Entities need a **monotonically increasing version** — `revision`, `updatedAt`, a sequence number. This is how sanitization tells "newer" from "stale":

```typescript
compare: (a) => (b) => 0 | 1 | -1; // version ordering (curried)
eq: (a) => (b) => boolean; // content equality at same version (curried)
```

Without versioning, conflict detection degrades to content equality only.

---

## State Handlers

Four built-in handlers for common state shapes. Each defines `create`, `update`, `remove`, and `merge`.

### `recordState` — flat key-value map

`Record<string, T>` indexed by a single key. The most common shape.

```typescript
const handler = recordState<Todo>({ key: 'id', compare, eq });
const crud = crudPrepare<Todo>('id');
```

### `nestedRecordState` — nested records

`Record<string, Record<string, ... T>>` for multi-level grouping. Curried to fix `T` and infer the keys tuple. `transitionId` joins path IDs with `/`.

```typescript
const handler = nestedRecordState<ProjectTodo>()({ keys: ['projectId', 'id'], compare, eq });
const crud = crudPrepare<ProjectTodo>()(['projectId', 'id']);
```

### `singularState` — single object

`T | null` for singletons (user profile, settings).

```typescript
const handler = singularState<Profile>({ compare, eq });
```

### `listState` — ordered list

`T[]` where insertion order matters.

```typescript
const handler = listState<Todo>({ key: 'id', compare, eq });
const crud = crudPrepare<Todo>('id');
```

Custom shapes can implement the `StateHandler` interface directly.

---

## Reducer Configuration

The 4th argument to `optimistron()` supports three modes:

**Auto-wired** — handler routes payloads by CRUD type:

```typescript
optimistron('todos', initial, handler, {
    create: createTodo,
    update: editTodo,
    remove: deleteTodo,
});
```

**Hybrid** — auto-wire + fallback for custom actions:

```typescript
optimistron('todos', initial, handler, {
    create: createTodo,
    update: editTodo,
    remove: deleteTodo,
    reducer: ({ getState }, action) => {
        /* custom logic */
    },
});
```

**Manual** — full control via `BoundStateHandler`:

```typescript
optimistron('todos', initial, handler, ({ getState, create, update, remove }, action) => {
    if (createTodo.match(action)) return create(action.payload);
    if (editTodo.match(action)) return update(action.payload);
    if (deleteTodo.match(action)) return remove(action.payload);
    return getState();
});
```

---

## Transition Modes

Declared per action type — controls what happens on re-stage and failure:

| Mode         | On re-stage    | On fail            | Typical use |
| ------------ | -------------- | ------------------ | ----------- |
| `DEFAULT`    | Overwrite      | Flag as failed     | Edits       |
| `DISPOSABLE` | Overwrite      | Drop transition    | Creates     |
| `REVERTIBLE` | Store trailing | Revert to previous | Deletes     |

---

## Selectors

### Optimistic state

```typescript
const selectTodos = createSelector(
    (state: RootState) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);
```

### Per-entity status

```typescript
import { selectIsOptimistic, selectIsFailed, selectIsConflicting } from '@lostsolution/optimistron';

selectIsOptimistic(id)(state.todos); // pending?
selectIsFailed(id)(state.todos); // failed?
selectIsConflicting(id)(state.todos); // stale conflict?
```

### Aggregate failures

```typescript
import { selectAllFailedTransitions } from '@lostsolution/optimistron';
selectAllFailedTransitions(state.todos, state.projects, state.activity);
```

---

## Development

```bash
bun test            # tests with coverage (threshold 90%)
bun run build:esm   # build to lib/
```

See `usecases/` for working examples with basic async, thunks, and sagas.

---

## Deep Dive

For internals, design decisions, and the full API reference, see [ARCHITECTURE.md](./ARCHITECTURE.md).
