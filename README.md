<p align="center">
  <img src=".github/banner.svg" alt="Optimistron" width="850"/>
</p>

<p align="center">
  <a href="https://redux.js.org/"><img src="https://img.shields.io/badge/redux-%5E5.0.1-764ABC?logo=redux&logoColor=white" alt="Redux ^5.0.1"/></a>
  <a href="https://redux-toolkit.js.org/"><img src="https://img.shields.io/badge/RTK-%5E2.11.2-764ABC?logo=redux&logoColor=white" alt="Redux Toolkit ^2.11.2"/></a>
</p>

> Opinionated optimistic state management for Redux. Tracks transitions alongside reducer state and derives the optimistic view at the selector level — like `git rebase`. No state copies. No checkpoints.

## Why

Existing optimistic Redux libraries store full state checkpoints to enable rollback:

- **redux-optimist**: saves a complete state snapshot at transaction open, replays all subsequent actions from it on revert
- **redux-optimistic-ui**: wraps state in `{ beforeState, current, history }` — `beforeState` is a full copy of the state tree before any optimistic transaction began
- **Hand-rolled thunk patterns**: `const previous = getState().slice` in a closure, restore on error

This means memory scales with **state size x number of in-flight operations**. For large normalized stores, each pending action carries a shadow copy. Reverts replay the entire reducer chain — O(actions x reducer cost).

Optimistron takes a different approach: **no state copies, no checkpoints**. Optimistic state is derived at the selector level — which is already memoized by `reselect` in most Redux apps. You get optimistic UI for free on the read path, with zero write-path overhead.

---

## The Mental Model

Think of your Redux store like a git repository:

- **Committed state** = `main`. Source of truth — only `COMMIT` writes here.
- **Transitions** = staged commits on top. Intended changes that haven't landed yet.
- **`selectOptimistic`** = `rebase`. Replays transitions on committed state at read-time. Never stored — always derived.
- **Sanitization** = conflict detection. After every mutation, transitions are replayed. No-ops get discarded. Conflicts get flagged.

`STAGE`, `AMEND`, `FAIL`, `STASH` never touch reducer state — they only modify the transitions list. The optimistic view updates because `selectOptimistic` re-derives it on the next read.

No `isLoading`, `error`, `isOptimistic` flags. A pending transition means loading. A failed one means error. A conflicting one means stale. One source of truth, zero boilerplate.

---

## Transition Lifecycle

<p align="center">
  <img src=".github/lifecycle.svg" alt="Transition Lifecycle" width="850"/>
</p>

---

## Quick Start

```typescript
import { configureStore, createSelector } from '@reduxjs/toolkit';
import { optimistron, createTransitions, indexedStateFactory } from '@lostsolution/optimistron';

type Todo = { id: string; value: string; done: boolean; revision: number };

const createTodo = createTransitions('todos::add')((todo: Todo) => ({ payload: { todo } }));
const editTodo = createTransitions('todos::edit')((id: string, todo: Todo) => ({ payload: { id, todo } }));
const deleteTodo = createTransitions('todos::delete')((id: string) => ({ payload: { id } }));

const { reducer: todos, selectOptimistic } = optimistron(
    'todos',
    {} as Record<string, Todo>,
    indexedStateFactory<Todo>({
        itemIdKey: 'id',
        compare: (a) => (b) => (a.revision === b.revision ? 0 : a.revision > b.revision ? 1 : -1),
        eq: (a) => (b) => a.done === b.done && a.value === b.value,
    }),
    ({ getState, create, update, remove }, action) => {
        if (createTodo.match(action)) return create(action.payload.todo);
        if (editTodo.match(action)) return update(action.payload.id, action.payload.todo);
        if (deleteTodo.match(action)) return remove(action.payload.id);
        return getState();
    },
);

const store = configureStore({ reducer: { todos } });

const selectTodos = createSelector(
    (state) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);

dispatch(createTodo.stage(todo.id, todo)); // UI updates instantly
dispatch(createTodo.commit(todo.id)); // persist on success
dispatch(createTodo.fail(todo.id, error)); // flag on error
```

---

## Rules

### Transition IDs

Every transition is tracked by a string ID — the first argument to `.stage()`, `.commit()`, etc. This ID is the **consistent key** between a transition and the entity it describes. It's how `selectIsFailed(id)` and `selectIsOptimistic(id)` infer per-entity status. Any stable derivation works, but each ID should resolve to exactly one entity.

### Versioning

Entities need a **monotonically increasing version** — `revision`, `updatedAt`, anything orderable. The `compare` function uses this to determine if a transition is still valid, stale, or redundant during sanitization. Without it, conflict detection can't distinguish "newer" from "older".

### The rules

1. **One ID, one entity** — each transition ID resolves to a single entity.
2. **One at a time** — don't stage while one is already pending for the same ID.
3. **Granular** — one create, one update, or one delete per transition.

---

## Development

```bash
bun test              # run tests (coverage threshold 90%)
bun run build:esm     # build to lib/
```

See `usecases/` for working examples with async, thunks, and sagas.
