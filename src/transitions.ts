import type { Action } from '@reduxjs/toolkit';
import { META_KEY } from './constants';
import { type BoundReducer } from './reducer';
import type { bindStateFactory } from './state';
import { type TransitionState } from './state';

export enum OptimisticMergeResult {
    SKIP = 'SKIP',
    CONFLICT = 'CONFLICT',
}

export enum Operation {
    AMEND = 'amend',
    COMMIT = 'commit',
    FAIL = 'fail',
    STAGE = 'stage',
    STASH = 'stash',
}

export enum DedupeMode {
    OVERWRITE,
    TRAILING,
}

export type TransitionNamespace<T extends Operation = Operation> = `${string}::${T}`;
export type WithTransition<A, T = Operation> = A & { meta: TransitionMeta<T> };
export type TransitionMeta<T = Operation> = { [META_KEY]: Transition<T> };
export type TransitionAction<T extends Operation = Operation> = WithTransition<Action<TransitionNamespace<T>>>;
export type StagedAction = TransitionAction<Operation.STAGE>;
export type CommittedAction = TransitionAction<Operation.COMMIT>;

export type Transition<T = Operation> = {
    id: string;
    operation: T;
    dedupe: DedupeMode;
    conflict?: boolean;
    failed?: boolean;
    trailing?: StagedAction;
};

/** Extracts the transition meta definitions on an action */
export const getTransitionMeta = (action: TransitionAction) => action.meta[META_KEY];
export const getTransitionID = (action: TransitionAction) => action.meta[META_KEY].id;

export const isTransition = (action: Action): action is TransitionAction =>
    'meta' in action && typeof action.meta === 'object' && action.meta !== null && META_KEY in action.meta;

/** Checks wether an action is a transition for the supplied namespace */
export const isTransitionForNamespace = (action: Action, namespace: string): action is TransitionAction =>
    isTransition(action) && action.type.startsWith(`${namespace}::`);

export const toType = <T extends Operation>(type: TransitionNamespace, operation: T): TransitionNamespace<T> => {
    const parts = type.split('::');
    const base = parts.slice(0, parts.length - 1).join('::');

    return `${base}::${operation}`;
};

/** Updates the transition meta of a transition action */
export const updateTransition = <A extends TransitionAction, T extends Partial<Transition>>(action: A, update: T) =>
    ({
        ...action,
        meta: {
            ...action.meta,
            [META_KEY]: {
                ...action.meta[META_KEY],
                ...update,
            },
        },
    }) satisfies TransitionAction as T['operation'] extends Operation ? TransitionAction<T['operation']> : A;

/** Maps a transition to a staged transition */
export const toStaged = (action: TransitionAction, update: Partial<Transition> = {}): StagedAction =>
    updateTransition(
        { ...action, type: toType(action.type, Operation.STAGE) },
        { ...update, operation: Operation.STAGE },
    );

/** Maps a transition to a comitted transition */
export const toCommit = (action: TransitionAction, update: Partial<Transition> = {}): CommittedAction =>
    updateTransition(
        { ...action, type: toType(action.type, Operation.COMMIT) },
        { ...update, operation: Operation.COMMIT },
    );

export const processTransition = (transition: TransitionAction, transitions: StagedAction[]): StagedAction[] => {
    const { operation, id, dedupe } = getTransitionMeta(transition);
    const matchIdx = transitions.findIndex((entry) => id === getTransitionID(entry));
    const existing = transitions[matchIdx];

    switch (operation) {
        /* During the `stage` or `amend` transition, check for an existing transition with the same ID.
         * If found, replace it; otherwise, add the new transition to the list */
        case Operation.STAGE:
        case Operation.AMEND: {
            /** if no staging operation to amend return transitions in-place */
            if (matchIdx === -1 && operation === Operation.AMEND) return transitions;

            const stage = toStaged(transition, operation === Operation.AMEND ? getTransitionMeta(existing) : {});
            const nextTransitions = [...transitions];

            if (matchIdx !== -1) {
                const trailing = existing.type === transition.type ? getTransitionMeta(existing).trailing : existing;

                /* When dedupe mode is set to `TRAILING`, store the previous transition as a
                 * trailing transition. This helps in handling reversion to the previous
                 * transition when stashing the current one. */
                if (dedupe === DedupeMode.TRAILING) {
                    nextTransitions[matchIdx] = updateTransition(stage, { trailing });
                } else nextTransitions[matchIdx] = stage;

                /* new transition */
            } else nextTransitions.push(stage);

            return nextTransitions;
        }

        /* During the 'fail' transition, we flag the matching transition as failed */
        case Operation.FAIL: {
            if (matchIdx === -1) return transitions;

            return transitions.map((entry) =>
                getTransitionID(entry) === id ? updateTransition(entry, { failed: true }) : entry,
            );
        }

        /* During a 'stash' transition, check for trailing transitions related to the transition to
         * be stashed. If a trailing transition is found, replace the stashed transition, allowing
         * reversion to any trailing transitions. */
        case Operation.STASH: {
            const existing = transitions[matchIdx];

            if (existing) {
                const { trailing } = getTransitionMeta(existing);
                return [
                    ...transitions.slice(0, matchIdx),
                    ...(trailing ? [trailing] : []),
                    ...transitions.slice(matchIdx + 1),
                ];
            }

            return transitions;
        }

        /* In the 'commit' transitions, remove the transition with the specified ID
         * from the list of transitions. */
        case Operation.COMMIT: {
            if (!transitions.length) return transitions;
            return transitions.filter((entry) => id !== getTransitionID(entry));
        }
    }
};

/* Sanitizing transitions involves simulating the application of transitions as if they were committed,
 * and performing a sanity 'merge' check on each iteration. This process helps cleanse the transitions
 * list by eliminating no-op actions and identifying potential conflicts. */
export const sanitizeTransitions =
    <State, CreateParams extends any[], UpdateParams extends any[], DeleteParams extends any[]>(
        boundReducer: BoundReducer<State>,
        bindState: ReturnType<typeof bindStateFactory<State, CreateParams, UpdateParams, DeleteParams>>,
    ) =>
    (state: TransitionState<State>) => {
        const sanitized = state.transitions.reduce<{
            mutated: boolean;
            transitions: StagedAction[];
            transitionState: TransitionState<State>;
        }>(
            (acc, action) => {
                try {
                    /* apply the transition action as if it had been committed in order
                     * to detect if this action can still be applied or if - depending on
                     * the use-case - it should be flagged as `conflicting` */
                    const asIfCommitted = toCommit(action);
                    const nextState = boundReducer(acc.transitionState, asIfCommitted);
                    const noop = nextState === acc.transitionState;

                    /* if the transition action did not have any effect on the state
                     * then discard it - depending on how you define your reducer this
                     * can be particularly useful to discard a transition action when
                     * we cannot infer a merge error (ie: edit action on a non-existing
                     * item in which the merge function cannot infer a conflict) */
                    if (noop) acc.mutated = true;
                    else {
                        /* if the action did have an effect on state without throwing any
                         * merge errors then it is considered valid */
                        acc.transitionState.state = bindState(acc.transitionState.state).merge(nextState);
                        acc.transitions.push(action);
                    }
                } catch (mergeError: unknown) {
                    /* This will catch any errors thrown from your handler's `merge` function.
                     * In addition, if an action application throws at the reducer level, the
                     * transition action will be treated as a `OptimisticMergeResult.SKIP` */
                    acc.mutated = true;
                    switch (mergeError) {
                        case OptimisticMergeResult.SKIP:
                            break; /* Discard the optimistic transition */

                        case OptimisticMergeResult.CONFLICT:
                            acc.transitions.push(updateTransition(action, { conflict: true }));
                            break;
                    }
                }

                return acc;
            },
            {
                mutated: false,
                transitions: [],
                transitionState: Object.assign({}, state),
            },
        );

        return sanitized.mutated ? sanitized.transitions : state.transitions;
    };
