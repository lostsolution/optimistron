import { OptimisticOperation, getOptimisticMeta, updateAction, type OptimisticAction } from './actions';
import { type BoundReducer } from './reducer';
import { cloneOptimisticState, createStateHandler, type OptimisticState } from './state';

export enum OptimisticMergeResult {
    SKIP,
    CONFLICT,
}

/* Apply the effect of an optimistic action to an array of mutations.
 * This function handles different operations, such as staging, failing,
 * stashing, or committing optimistic actions, and updates the provided
 * array of mutations accordingly */
export const processMutation = (action: OptimisticAction, mutations: OptimisticAction[]): OptimisticAction[] => {
    const { operation, id } = getOptimisticMeta(action);

    switch (operation) {
        case OptimisticOperation.STAGE: {
            const nextMutations = [...mutations];
            const matchIdx = mutations.findIndex((entry) => id === getOptimisticMeta(entry).id);

            if (matchIdx !== -1) nextMutations[matchIdx] = action;
            else nextMutations.push(action);

            return nextMutations;
        }

        case OptimisticOperation.FAIL: {
            return mutations.map((entry) =>
                getOptimisticMeta(entry).id === id ? updateAction(entry, { failed: true }) : entry,
            );
        }

        case OptimisticOperation.STASH:
        case OptimisticOperation.COMMIT: {
            return mutations.filter((entry) => id !== getOptimisticMeta(entry).id);
        }
    }
};

export const sanitizeMutations =
    <State, CreateParams extends any[], UpdateParams extends any[], DeleteParams extends any[]>(
        boundReducer: BoundReducer<State>,
        bindHandler: ReturnType<typeof createStateHandler<State, CreateParams, UpdateParams, DeleteParams>>,
    ) =>
    (state: OptimisticState<State>) => {
        const sanitized = state.mutations.reduce<{
            mutations: OptimisticAction[];
            changed: boolean;
            optimistic: OptimisticState<State>;
        }>(
            (acc, action) => {
                try {
                    /* apply the optimistic action as if it had been committed in order
                     * to detect if this action can still be applied or if - depending on
                     * your use-case - it should be flagged as `conflicting` */
                    const asIfCommitted = updateAction(action, { operation: OptimisticOperation.COMMIT });
                    const nextState = boundReducer(acc.optimistic, asIfCommitted);
                    const noop = nextState === acc.optimistic;

                    /* if the optimistic action did not have any effect on the state
                     * then discard it - depending on how you define your reducer this
                     * can be particularly useful to discard an optimistic action when
                     * we cannot infer a merge error (ie: optimistic edit on a non-existing
                     * item in which the merge function cannot infer a conflict) */
                    if (noop) acc.changed = true;
                    /* if the action did have an effect on state without throwing any
                     * merge errors then it is considered valid */ else {
                        acc.optimistic.state = bindHandler(acc.optimistic.state).merge(nextState);
                        acc.mutations.push(action);
                    }
                    /* This will catch any errors thrown from your handler's `merge` function.
                     * In addition, if an action application throws at the reducer level, the
                     * optimistic action will be treated as a `OptimisticMergeResult.SKIP` */
                } catch (mergeError: unknown) {
                    acc.changed = true;
                    switch (mergeError) {
                        case OptimisticMergeResult.SKIP:
                            break; /* Discard the optimistic mutation */

                        case OptimisticMergeResult.CONFLICT:
                            /* flag the optimistic action as conflicting */
                            acc.mutations.push(updateAction(action, { conflict: true }));
                            break;
                    }
                }

                return acc;
            },
            { mutations: [], changed: false, optimistic: cloneOptimisticState(state) },
        );

        return sanitized.changed ? sanitized.mutations : state.mutations;
    };