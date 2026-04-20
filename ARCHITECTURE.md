# Architecture

Internals and design decisions. For usage, see [README.md](./README.md).

---

## Data Flow

<p align="center">
  <img src=".github/dataflow.svg" alt="Data Flow" width="100%"/>
</p>

**Write path** — dispatching actions:
1. `stage`/`amend` — only the transitions list is updated, committed state is untouched
2. `commit` — committed state is updated via the bound reducer, transition is removed
3. After every mutation (gated by `===`), `sanitizeTransitions` replays remaining transitions to detect no-ops and conflicts

**Read path** — selecting state:
1. `selectOptimistic` replays pending transitions on top of committed state
2. Returns the derived view — never stored, always computed
3. Memoization is the consumer's responsibility via `createSelector`

---

## Entity Identity

Every transition carries a string ID — the stable link between a transition and its entity.

**Default: `transitionId === entityId`.** `crudPrepare` couples them automatically. Only `stage` auto-detects — `amend`/`commit`/`fail`/`stash` require explicit `transitionId` because the entity may carry a server-assigned ID that differs from the transition's.

---

## Sanitization

<p align="center">
  <img src=".github/sanitization.svg" alt="Sanitization Flow" width="100%"/>
</p>

After every state mutation, `sanitizeTransitions` replays all pending transitions against committed state:

1. For each transition: apply as-if-committed, check if state reference changed (`!==`), then `merge` to validate
2. Result per transition: **keep** (valid), **discard** (no-op/skip), or **flag** (conflict)

Only runs when state actually changes — gated by referential equality.

---

## Transition Modes

`TransitionMode` controls both re-staging and failure behavior. Declared per action type at the `createTransitions` site — making invalid state combinations unrepresentable.

- **`DEFAULT`** — overwrites on re-stage, flags on fail. Edits.
- **`DISPOSABLE`** — overwrites on re-stage, drops on fail. Creates (entity never existed server-side).
- **`REVERTIBLE`** — stores trailing fallback on re-stage, reverts on fail. Deletes (undo deletion).

---

## StateHandler Interface

```typescript
interface StateHandler<State, C, U, D> {
    create: (state: State, dto: C) => State;
    update: (state: State, dto: U) => State;
    remove: (state: State, dto: D) => State;
    merge:  (current: State, incoming: State) => State;
}
```

**Critical:** `update` and `remove` must return the **same reference** when nothing changed — sanitization uses `===` to detect no-ops.

Built-in handlers (`recordState`, `nestedRecordState`, `singularState`, `listState`) implement this. Custom handlers must follow the same contract: return same reference on no-op, throw `OptimisticMergeResult.SKIP`/`.CONFLICT` from `merge`.

---

## Module Map

```
src/
├── core/                         # Pure Redux — no saga dependency
│   ├── index.ts                  # Core barrel
│   ├── optimistron.ts            # Factory: wraps reducer, returns { reducer, selectors }
│   ├── transitions.ts            # Transition operations, processTransition, sanitizeTransitions
│   ├── reducer.ts                # resolveReducer, bindReducer
│   ├── constants.ts              # META_KEY
│   ├── actions/
│   │   ├── index.ts              # Barrel
│   │   ├── transitions.ts        # createTransition, createTransitions, resolveTransition
│   │   ├── crud.ts               # crudPrepare
│   │   ├── crud-transitions.ts   # createCrudTransitions
│   │   └── types.ts              # TransitionActions, InferPayload, DTOs
│   ├── selectors/
│   │   └── internal.ts           # All selectors (exposed via optimistron().selectors)
│   ├── state/
│   │   ├── types.ts              # TransitionState, StateHandler, WiredStateHandler
│   │   ├── factory.ts            # bindStateFactory, buildTransitionState
│   │   ├── record.ts             # recordState, nestedRecordState
│   │   ├── singular.ts           # singularState
│   │   └── list.ts               # listState
│   └── utils/
│       ├── path.ts               # getAt, setAt, removeAt
│       ├── types.ts              # StringKeys, PathMap, Maybe, MaybeNull
│       └── logger.ts             # warn
├── saga/                         # Saga orchestration effects
│   ├── index.ts                  # Saga barrel
│   └── effects.ts                # watchTransition, handleTransition, retryFailed
└── index.ts                      # Root barrel (core + saga)
```

---

## Performance Invariants

1. **No full state copies.** Only shallow copy is in `sanitizeTransitions` — a mutable working copy, not a checkpoint.
2. **Referential equality (`===`) gates sanitization.** `transitionStateFactory` returns the previous state object when nothing changed.
3. **`selectOptimistic` replays all transitions on every call.** Fast-path returns early when `transitions.length === 0`. Memoize with `createSelector`.
4. **Handler operations return the same reference on no-op.** This is how sanitization detects no-ops.
