import type { AnyAction, PrepareAction } from '@reduxjs/toolkit';
import { MetaKey } from '~constants';
import { type BoundReducer } from '~reducer';
import type { bindStateFactory } from '~state';
import { cloneTransitionState, type TransitionState } from '~state';

export enum OptimisticMergeResult {
    SKIP = 'SKIP',
    CONFLICT = 'CONFLICT',
}

export enum TransitionOperation {
    AMEND,
    COMMIT,
    FAIL,
    STAGE,
    STASH,
}

export enum TransitionDedupeMode {
    OVERWRITE,
    TRAILING,
}

export type TransitionNamespace = `${string}::${string}`;
export type TransitionAction<Action = AnyAction> = Action & { meta: { [MetaKey]: TransitionMeta } };

export type TransitionMeta = {
    conflict: boolean;
    dedupe: TransitionDedupeMode;
    failed: boolean;
    id: string;
    operation: TransitionOperation;
    trailing?: TransitionAction;
};

/** Extracts the transition meta definitions on an action */
export const getTransitionMeta = (action: TransitionAction) => action.meta[MetaKey];
export const getTransitionID = (action: TransitionAction) => action.meta[MetaKey].id;

/**  Hydrates an action's transition meta definition */
export const withTransitionMeta = (
    action: ReturnType<PrepareAction<any>>,
    options: TransitionMeta,
): TransitionAction<typeof action> => ({
    ...action,
    meta: {
        ...('meta' in action ? action.meta : {}),
        [MetaKey]: options,
    },
});

export const isTransition = (action: AnyAction): action is TransitionAction => action?.meta && MetaKey in action.meta;

/** Checks wether an action is a transition for the supplied namespace */
export const isTransitionForNamespace = (
    action: AnyAction,
    namespace: string,
): action is TransitionAction<typeof action> => isTransition(action) && action.type.startsWith(`${namespace}::`);

/** Updates the transition meta of a transition action */
export const updateTransition = <T>(
    action: TransitionAction<T>,
    update: Partial<TransitionMeta>,
): TransitionAction<T> => ({
    ...action,
    meta: {
        ...action.meta,
        [MetaKey]: {
            ...action.meta[MetaKey],
            ...update,
        },
    },
});

export const processTransition = (
    transition: TransitionAction,
    transitions: TransitionAction[],
): TransitionAction[] => {
    const { operation, id, dedupe } = getTransitionMeta(transition);

    switch (operation) {
        /* During the `stage` or `amend` transition, check for an existing transition with the same ID.
         * If found, replace it; otherwise, add the new transition to the list */
        case TransitionOperation.STAGE:
        case TransitionOperation.AMEND: {
            const nextTransitions = [...transitions];
            const matchIdx = transitions.findIndex((entry) => id === getTransitionID(entry));

            if (matchIdx !== -1) {
                const existing = nextTransitions[matchIdx];
                const trailing = existing.type === transition.type ? getTransitionMeta(existing).trailing : existing;

                /* When dedupe mode is set to `TRAILING`, store the previous transition as a trailing
                 * transition. This helps in handling reversion to the previous transition when stashing
                 * the current one. */
                if (dedupe === TransitionDedupeMode.TRAILING) {
                    nextTransitions[matchIdx] = updateTransition(transition, { trailing });
                } else nextTransitions[matchIdx] = transition;

                /* new transition */
            } else nextTransitions.push(transition);

            return nextTransitions;
        }

        /* During the 'fail' transition, we flag the matching transition as failed */
        case TransitionOperation.FAIL: {
            return transitions.map((entry) =>
                getTransitionID(entry) === id ? updateTransition(entry, { failed: true }) : entry,
            );
        }

        /* During a 'stash' transition, check for trailing transitions related to the transition to
         * be stashed. If a trailing transition is found, replace the stashed transition, allowing
         * reversion to any trailing transitions. */
        case TransitionOperation.STASH: {
            const matchIdx = transitions.findIndex((entry) => id === getTransitionID(entry));
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
        case TransitionOperation.COMMIT: {
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
            transitions: TransitionAction[];
            transitionState: TransitionState<State>;
        }>(
            (acc, action) => {
                try {
                    /* apply the transition action as if it had been committed in order
                     * to detect if this action can still be applied or if - depending on
                     * the use-case - it should be flagged as `conflicting` */
                    const asIfCommitted = updateTransition(action, { operation: TransitionOperation.COMMIT });
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
                    /* This will catch any errors thrown from your handler's `merge` function.
                     * In addition, if an action application throws at the reducer level, the
                     * transition action will be treated as a `OptimisticMergeResult.SKIP` */
                } catch (mergeError: unknown) {
                    acc.mutated = true;
                    switch (mergeError) {
                        case OptimisticMergeResult.SKIP:
                            break; /* Discard the optimistic transition */

                        case OptimisticMergeResult.CONFLICT:
                            /** FIXME: should we process the state update here ? */
                            /* flag the optimistic transition as conflicting */
                            acc.transitions.push(updateTransition(action, { conflict: true }));
                            break;
                    }
                }

                return acc;
            },
            {
                mutated: false,
                transitions: [],
                transitionState: cloneTransitionState(state),
            },
        );

        return sanitized.mutated ? sanitized.transitions : state.transitions;
    };
