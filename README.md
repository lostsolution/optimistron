<p align="center">
  <img src=".github/banner.svg" alt="Optimistron" width="850"/>
</p>

<p align="center">
  <a href="https://redux.js.org/"><img src="https://img.shields.io/badge/redux-%5E5.0.1-764ABC?logo=redux&logoColor=white" alt="Redux ^5.0.1"/></a>
  <a href="https://redux-toolkit.js.org/"><img src="https://img.shields.io/badge/RTK-%5E2.11.2-764ABC?logo=redux&logoColor=white" alt="Redux Toolkit ^2.11.2"/></a>
  <a href="https://redux-saga.js.org/"><img src="https://img.shields.io/badge/redux--saga-%5E1.4.2-999999?logo=redux-saga&logoColor=white" alt="Redux Saga ^1.4.2"/></a>
</p>

> Saga-first optimistic state management for Redux. Components dispatch intent, sagas orchestrate the lifecycle, optimistic state is derived at read-time by replaying transitions — like `git rebase`.

---

## Install

```bash
npm install @lostsolution/optimistron
# requires: redux ^5, @reduxjs/toolkit ^2, redux-saga ^1
```

### Subpath exports

| Import | Includes | Requires saga? |
|--------|----------|----------------|
| `@lostsolution/optimistron` | Core + saga effects | Yes |
| `@lostsolution/optimistron/core` | Core only (reducers, actions, selectors) | No |
| `@lostsolution/optimistron/saga` | Saga effects only | Yes |

Use `/core` for thunks, listener middleware, or manual orchestration — no saga dependency.

---

## Quick Start

```typescript
import { configureStore, createAction, createSelector } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import {
    optimistron, createCrudTransitions, recordState,
    watchTransition, retryFailed,
} from '@lostsolution/optimistron';

// 1. Define your entity
type Todo = { id: string; value: string; done: boolean; revision: number };

// 2. Create CRUD transition actions (golden-path modes built in)
const todo = createCrudTransitions<Todo>('todos', 'id');

// 3. Create the optimistic reducer
const { reducer: todos, selectors } = optimistron(
    'todos',
    {} as Record<string, Todo>,
    recordState<Todo>({
        key: 'id',
        version: (t) => t.revision,
        eq: (a, b) => a.done === b.done && a.value === b.value,
    }),
    { create: todo.create, update: todo.update, remove: todo.remove },
);

// 4. Wire up the store
const sagaMiddleware = createSagaMiddleware();
const store = configureStore({
    reducer: { todos },
    middleware: (getDefault) => getDefault().concat(sagaMiddleware),
});

// 5. Sagas — one line per transition
function* rootSaga() {
    yield watchTransition(todo.create, api.createTodo, {
        amend: (payload, saved) => ({ ...payload, id: saved.id }),
    });
    yield watchTransition(todo.update, api.updateTodo);
    yield watchTransition(todo.remove, api.deleteTodo);
    // stash-on-fail is automatic for REVERTIBLE transitions (removes)

    const retryAll = createAction('todos::retryAll');
    yield retryFailed(retryAll, (state) => selectors.selectFailures(state.todos));
}

sagaMiddleware.run(rootSaga);

// 6. Select optimistic state
const selectTodos = createSelector(
    (state: RootState) => state.todos,
    selectors.selectOptimistic((todos) => Object.values(todos.committed)),
);

// 7. Components only dispatch intent
dispatch(todo.create.stage(item));   // shows immediately
dispatch(todo.update.stage(edited)); // saga handles commit/fail
```

---

## The Mental Model

Think of each `optimistron()` reducer as a **git branch**:

| Git            | Optimistron                                                          |
| -------------- | -------------------------------------------------------------------- |
| Branch tip     | **Committed state** — only `COMMIT` advances it                      |
| Staged commits | **Transitions** — pending changes on top of committed state          |
| `git rebase`   | **`selectOptimistic`** — replays transitions at read-time            |
| Merge conflict | **Sanitization** — detects no-ops and conflicts after every mutation |

`STAGE`, `AMEND`, `FAIL`, `STASH` never touch reducer state — they only modify the transitions list. There are no separate `isLoading` / `error` / `isOptimistic` flags — a pending transition **is** the loading state, and a failed transition carries the error.

---

## Transition Lifecycle

<p align="center">
  <img src=".github/lifecycle.svg" alt="Transition Lifecycle" width="850"/>
</p>

---

## Saga Effects

### `watchTransition(actions, effect, options?)`

Returns a `takeEvery` effect. Watches for `stage` actions, calls the effect, then commits or fails based on the `TransitionMode` on the transition meta.

```typescript
yield watchTransition(todo.create, api.createTodo, {
    amend: (payload, result) => ({ ...payload, id: result.id }),
});
yield watchTransition(todo.update, api.updateTodo);
yield watchTransition(todo.remove, api.deleteTodo);
```

- **`effect`** — `(payload, action) => Promise<R>`. Wrapped in `call()` internally.
- **`options.amend`** — `(payload, result) => P`. Pure transform applied before commit.
- **fail vs stash** — auto-detected from `TransitionMode` on the transition meta.

### `handleTransition(actions, effect, options?)`

The inner worker generator, exposed for custom watcher patterns:

```typescript
yield takeLatest(todo.update.stage.match, handleTransition(todo.update, api.updateTodo));
```

### `retryFailed(trigger, selectFailed)`

Returns a `takeLeading` effect. Re-dispatches all failed transitions when the trigger fires.

```typescript
const retryAll = createAction('retryAll');
yield retryFailed(retryAll, (state: RootState) => [
    ...todosSelectors.selectFailures(state.todos),
    ...projectsSelectors.selectFailures(state.projects),
]);
```

---

## Three Rules

1. **One ID, one entity** — each transition ID maps to exactly one entity
2. **One at a time** — don't stage a new transition while one is already pending for the same ID
3. **One operation per transition** — a single create, update, or delete

---

## Transition Modes

Declared per action type — controls what happens on re-stage and failure:

| Mode         | On re-stage    | On fail            | Typical use |
| ------------ | -------------- | ------------------ | ----------- |
| `DEFAULT`    | Overwrite      | Flag as failed     | Edits       |
| `DISPOSABLE` | Overwrite      | Drop transition    | Creates     |
| `REVERTIBLE` | Store trailing | Revert to previous | Deletes     |

---

## State Handlers

Four built-in handlers for common state shapes:

| Handler | State shape | Usage |
|---------|-------------|-------|
| `recordState<T>` | `Record<string, T>` | Flat key-value map |
| `nestedRecordState<T>()` | `Record<string, Record<..., T>>` | Multi-level grouping |
| `singularState<T>` | `T \| null` | Singletons (profile, settings) |
| `listState<T>` | `T[]` | Ordered list |

Custom shapes can implement the `StateHandler` interface directly.

---

## Selectors

All selectors are returned from `optimistron()` on the `selectors` object.

```typescript
selectors.selectOptimistic(selector)(state.todos);    // derived optimistic view
selectors.selectIsOptimistic(id)(state.todos);         // pending?
selectors.selectIsFailed(id)(state.todos);             // failed?
selectors.selectIsConflicting(id)(state.todos);        // stale conflict?
selectors.selectFailures(state.todos);                 // all failed transitions
selectors.selectFailure(id)(state.todos);              // specific failed transition
selectors.selectConflict(id)(state.todos);             // specific conflict
```

---

## Versioning

Entities need a **monotonically increasing version** — `revision`, `updatedAt`, a sequence number:

```typescript
recordState<Todo>({
    key: 'id',
    version: (item) => item.revision,
    eq: (a, b) => a.done === b.done && a.value === b.value,
});
```

Without versioning, conflict detection degrades to content equality only.

---

## Without Sagas

<details>
<summary><b>Thunks</b></summary>

```typescript
import { createCrudTransitions, recordState } from '@lostsolution/optimistron/core';

const createTodoThunk = (todo: Todo): Thunk => async (dispatch) => {
    dispatch(todoActions.create.stage(todo));
    try {
        const saved = await api.create(todo);
        dispatch(todoActions.create.amend(todo.id, saved));
        dispatch(todoActions.create.commit(todo.id));
    } catch (e) {
        dispatch(todoActions.create.fail(todo.id, e));
    }
};
```

</details>

<details>
<summary><b>Component-level async</b></summary>

```typescript
import { createCrudTransitions, recordState } from '@lostsolution/optimistron/core';

const handleCreate = async (todo: Todo) => {
    dispatch(todoActions.create.stage(todo));
    try {
        const saved = await api.create(todo);
        dispatch(todoActions.create.amend(todo.id, saved));
        dispatch(todoActions.create.commit(todo.id));
    } catch (e) {
        dispatch(todoActions.create.fail(todo.id, e));
    }
};
```

</details>

---

## Development

```bash
bun test            # tests with coverage (threshold 90%)
bun run build:esm   # build to lib/
```

See `usecases/` for working examples with sagas, thunks, and basic async.

---

For internals and design decisions, see [ARCHITECTURE.md](./ARCHITECTURE.md).
