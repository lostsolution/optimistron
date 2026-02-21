# Optimistron

> ⚠️ **Work in progress** — API is not yet stable. Expect breaking changes.

Opinionated optimistic state management for Redux. Transitions are tracked alongside reducer state and applied through selectors — like a `git rebase` — avoiding separate state copies entirely.

## 📦 When to use

- Async Redux middleware (sagas, thunks) with optimistic UI
- Retry-able operations with failure states
- Offline-first patterns leveraging optimistic failures
- State that maps to CRUD operations via a custom `StateHandler`

## 📥 Install

```
npm install @lostsolution/optimistron
```

Peer dependencies: `@reduxjs/toolkit ^2.1.0`, `redux ^5.0.1`

## 🛠️ Development

```bash
bun test              # run tests (coverage threshold 90%)
bun run build:esm     # build to lib/
```

See `usecases/` for full examples with thunks and sagas.

## 🪖 Rules of transitions

1. 🪖 **Unique IDs** — transition IDs should map 1:1 to your entities. Typically just use the entity ID.
2. 🪖 **One transition per entity** — never stage a new transition while one is already pending for the same ID.
3. 🪖 **Granular effects** — keep transition actions fine-grained: one create, one update, one delete. No batch mutations.

## 💡 Why

Existing optimistic Redux libraries store full state checkpoints to enable rollback:

- **redux-optimist**: saves a complete state snapshot at transaction open, replays all subsequent actions from it on revert
- **redux-optimistic-ui**: wraps state in `{ beforeState, current, history }` — `beforeState` is a full copy of the state tree before any optimistic transaction began
- **Hand-rolled thunk patterns**: `const previous = getState().slice` in a closure, restore on error

This means memory scales with **state size x number of in-flight operations**. For large normalized stores, each pending action carries a shadow copy. Reverts replay the entire reducer chain — O(actions x reducer cost).

Optimistron takes a different approach: **no state copies, no checkpoints**. Optimistic state is derived at the selector level — which is already memoized by `reselect` in most Redux apps. You get optimistic UI for free on the read path, with zero write-path overhead.

## 🔧 How it works

Instead of cloning your state for rollback, Optimistron wraps your reducer to track **transitions** — actions with metadata that describe pending optimistic operations. Committed state is your source of truth; optimistic state is **derived** at read-time by replaying transitions on top of it.

```
                    ┌─────────────────────────────┐
                    │         Redux Store         │
                    │                             │
                    │     state: { a: 1, b: 2 }   │
                    │     transitions: [T1, T2]   │
                    │                             │
                    └─────────────┬───────────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
        dispatch()          dispatch()         selectOptimistic()
        stage/amend         commit/stash         ┌───────────┐
             │                    │              │  replay   │
             │                    │              │  T1, T2   │
             ▼                    ▼              │  on state │
      ┌──────────────┐   ┌───────────────┐       └─────┬─────┘
      │  transitions │   │    state      │             │
      │  list updated│   │    updated    │             ▼
      │  (no state   │   │  + transition │     optimistic view
      │   mutation)  │   │    removed    │      (never stored)
      └──────────────┘   └───────────────┘
```

### Transition lifecycle

A transition moves through operations that mirror async request states:

```
  STAGE ──→ COMMIT     (happy path: stage optimistically, commit on success)
    │
    ├─────→ AMEND      (update the staged transition before committing)
    │
    ├─────→ FAIL       (flag as failed — keep in list for retry/UI feedback)
    │
    └─────→ STASH      (remove from list — revert to trailing if TRAILING dedupe)
```

| Operation | Effect on state    | Effect on transitions            |
| --------- | ------------------ | -------------------------------- |
| `STAGE`   | None               | Adds to list                     |
| `AMEND`   | None               | Replaces in list                 |
| `COMMIT`  | Applies to reducer | Removes from list                |
| `FAIL`    | None               | Flags as failed                  |
| `STASH`   | None               | Removes (or reverts to trailing) |

Key insight: **only `COMMIT` mutates state**. All other operations only modify the transitions list. The optimistic view is always computed, never stored.

### Sanitization

After every state mutation, transitions are **replayed** against the new state to detect:

- **No-ops**: a transition whose effect is already reflected in state (e.g., editing an item that was deleted server-side) — **discarded**
- **Conflicts**: a transition that conflicts with the current state (e.g., editing an item whose revision moved ahead) — **flagged**

This runs on every reducer call, gated by referential equality (`===`) to skip when state hasn't changed.

```
  State mutated?
       │
       ├─ No  → skip sanitization
       │
       └─ Yes → for each transition:
                   │
                   ├─ apply as-if-committed
                   │     │
                   │     ├─ no effect?  → discard (no-op)
                   │     │
                   │     ├─ merge OK?   → keep
                   │     │
                   │     └─ merge throws?
                   │           │
                   │           ├─ SKIP     → discard
                   │           └─ CONFLICT → keep + flag
                   │
                   └─ return sanitized transitions
```

## 📐 Concepts

### TransitionState\<T\>

Wraps your state `T` with a `transitions` list and a namespace key. Both internal fields are **non-enumerable** — your state spreads cleanly and serializers ignore them.

```typescript
type TransitionState<T> = {
    state: T;
    transitions: StagedAction[]; // non-enumerable
    [REDUCER_KEY]: string; // non-enumerable
};
```

### StateHandler

The `StateHandler` interface defines how Optimistron interacts with your state shape. You can implement it for **any** state structure — flat objects, nested trees, arrays, or anything else. The `merge` function is the core of conflict detection: it compares "as-if-committed" state against current state and throws `OptimisticMergeResult.SKIP` or `CONFLICT` when appropriate.

```typescript
interface StateHandler<State, CreateParams, UpdateParams, DeleteParams> {
    create: (state: State, ...args: CreateParams) => State;
    update: (state: State, ...args: UpdateParams) => State;
    remove: (state: State, ...args: DeleteParams) => State;
    merge: (current: State, incoming: State) => State;
}
```

The reducer never touches state directly — it operates through a **bound state handler** that closes over the current state:

```typescript
({ getState, create, update, remove }, action) => {
    if (addItem.match(action)) return create(action.payload.item);
    return getState();
};
```

### IndexedState (built-in example)

`indexedStateFactory` is a **reference implementation** of `StateHandler` for `Record<string, T>` — the most common shape for entity collections. It's provided as a starting point; you can write your own handler for any state shape.

Handles create/update/delete with automatic no-op detection and merge conflict resolution via curried `compare` and `eq` functions:

```typescript
const handler = indexedStateFactory<Todo>({
    itemIdKey: 'id',
    compare: (a) => (b) => (a.revision > b.revision ? 1 : a.revision < b.revision ? -1 : 0),
    eq: (a) => (b) => a.value === b.value && a.done === b.done,
});
```

- `compare` determines ordering — if incoming < existing, it's a **conflict** (stale update)
- `eq` determines equality — if items compare equal but aren't `eq`, it's a **conflict** (concurrent edit)
- If incoming > existing, it's a valid update
- If the transition has no effect, it's a **no-op** and gets discarded

### Dedupe modes

When staging a transition with the same ID as an existing one:

- `OVERWRITE` (default): replaces the existing transition
- `TRAILING`: replaces but stores the previous transition as a fallback — on `STASH`, reverts to the trailing transition instead of removing entirely

## 🚀 Usage

### 1. Define transitions

```typescript
import { createTransitions, DedupeMode } from '@lostsolution/optimistron';

const createTodo = createTransitions('todos::add')((todo: Todo) => ({ payload: { todo } }));
const editTodo = createTransitions('todos::edit')((id: string, todo: Todo) => ({ payload: { id, todo } }));
const deleteTodo = createTransitions('todos::delete', DedupeMode.TRAILING)((id: string) => ({ payload: { id } }));
```

Each returns `{ stage, amend, commit, fail, stash, match }` — action creators for each operation plus a matcher that matches only `COMMIT` actions (for use in your reducer).

### 2. Create an optimistic reducer

```typescript
import { optimistron, indexedStateFactory } from '@lostsolution/optimistron';

const todos = optimistron(
    'todos', // namespace
    initialState, // initial state
    indexedStateFactory<Todo>({ itemIdKey: 'id', compare, eq }), // state handler
    ({ getState, create, update, remove }, action) => {
        // reducer
        if (createTodo.match(action)) return create(action.payload.todo);
        if (editTodo.match(action)) return update(action.payload.id, action.payload.todo);
        if (deleteTodo.match(action)) return remove(action.payload.id);
        return getState();
    },
);
```

The reducer receives a **bound state handler** — not the raw state. This ensures all mutations go through the handler's CRUD operations, keeping them granular and mergeable.

### 3. Dispatch transitions

```typescript
// Stage optimistically (UI updates immediately via selectors)
dispatch(createTodo.stage(transitionId, newTodo));

try {
    const result = await api.createTodo(newTodo);
    // Amend with server response (e.g., real ID), then commit
    dispatch(createTodo.amend(transitionId, { ...newTodo, id: result.id }));
    dispatch(createTodo.commit(transitionId));
} catch (error) {
    dispatch(createTodo.fail(transitionId, error));
    // or: dispatch(createTodo.stash(transitionId)); to silently revert
}
```

### 4. Read optimistic state

```typescript
import { createSelector } from '@reduxjs/toolkit';
import { selectOptimistic, selectIsOptimistic, selectIsFailed, selectIsConflicting } from '@lostsolution/optimistron';

// Derive the optimistic view — transitions replayed on committed state
const selectTodos = createSelector(
    (state: RootState) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);

// Per-entity optimistic status (uses transitionId === entityId pattern)
const selectTodoStatus = (id: string) =>
    createSelector(
        (state: RootState) => state.todos,
        (todos) => ({
            optimistic: selectIsOptimistic(id)(todos),
            failed: selectIsFailed(id)(todos),
            conflicting: selectIsConflicting(id)(todos),
        }),
    );
```

`selectOptimistic` replays transitions on every call — wrap with `createSelector` for memoization.
