import {
    TransitionOperation,
    getTransitionMeta,
    updateTransition,
    type TransitionAction,
    getTransitionID,
} from './actions';
import { type BoundReducer } from './reducer';
import { cloneTransitionState, bindStateFactory, type TransitionState } from './state';

export enum OptimisticMergeResult {
    SKIP,
    CONFLICT,
}

export const processTransition = (
    transition: TransitionAction,
    transitions: TransitionAction[],
): TransitionAction[] => {
    const { operation, id } = getTransitionMeta(transition);

    switch (operation) {
        /* During the `stage` transition, we check whether we have an existing transition with
         * the provided ID. If an existing transition is found, we replace it in place; otherwise,
         * we add the new transition to the list. */
        case TransitionOperation.STAGE: {
            const nextTransitions = [...transitions];
            const matchIdx = transitions.findIndex((entry) => id === getTransitionID(entry));

            if (matchIdx !== -1) nextTransitions[matchIdx] = transition;
            else nextTransitions.push(transition);

            return nextTransitions;
        }

        /* During the 'fail' transition, we flag the matching transition as failed */
        case TransitionOperation.FAIL: {
            return transitions.map((entry) =>
                getTransitionID(entry) === id ? updateTransition(entry, { failed: true }) : entry,
            );
        }

        /* In the 'stash' or 'commit' transitions, both actions have the same effect:
         * removing the transition with the specified ID from the list of transitions. */
        case TransitionOperation.STASH:
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
            changed: boolean;
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
                    if (noop) acc.changed = true;
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
                    acc.changed = true;
                    switch (mergeError) {
                        case OptimisticMergeResult.SKIP:
                            break; /* Discard the optimistic transition */

                        case OptimisticMergeResult.CONFLICT:
                            /* flag the optimistic transition as conflicting */
                            acc.transitions.push(updateTransition(action, { conflict: true }));
                            break;
                    }
                }

                return acc;
            },
            {
                changed: false,
                transitions: [],
                transitionState: cloneTransitionState(state),
            },
        );

        return sanitized.changed ? sanitized.transitions : state.transitions;
    };
