import type { Reducer } from 'redux';
import { OptimisticOperation, getOptimisticMeta, isOptimisticActionForNamespace } from './actions';
import { processMutation, sanitizeMutations } from './mutations';
import { OptimistronReducerRefs, bindReducer, type HandlerReducer } from './reducer';
import {
    OptimisticState,
    buildOptimisticState,
    createStateHandler,
    updateOptimisticState,
    type StateHandler,
} from './state';
import { generateId } from './utils';

export const optimistron = <S, C extends any[], U extends any[], D extends any[]>(
    namespace: string,
    initialState: S,
    handler: StateHandler<S, C, U, D>,
    reducer: HandlerReducer<S, C, U, D>,
): Reducer<OptimisticState<S>> => {
    /* keep a reference to the underlying reducer in order for optimistic
     * selectors to apply the optimistic mutations when executed */
    const reducerId = generateId();

    const bindState = createStateHandler<S, C, U, D>(handler);
    const boundReducer = bindReducer(reducer, bindState);
    OptimistronReducerRefs.set(reducerId, boundReducer);

    const sanitizer = sanitizeMutations(boundReducer, bindState);
    const initial: OptimisticState<S> = buildOptimisticState(initialState, [], reducerId);

    return (optimisticState = initial, action) => {
        const nextOptimisticState: OptimisticState<S> = (() => {
            const { state, mutations } = optimisticState;
            const next = updateOptimisticState(optimisticState);

            if (isOptimisticActionForNamespace(action, namespace)) {
                const nextMutations = processMutation(action, mutations);
                const { operation } = getOptimisticMeta(action);

                switch (operation) {
                    case OptimisticOperation.COMMIT:
                        /* comitting will apply the action to the reducer */
                        const commit = boundReducer(optimisticState, action);
                        return next(commit, nextMutations);
                    default:
                        /* every other optimistic action are not applied to the
                         * state, if you need to get the optimistic state use the
                         * provided selectors which will apply the optimistic mutations */
                        return next(state, nextMutations);
                }
            }

            return next(boundReducer(optimisticState, action), mutations);
        })();

        /* only sanitize the mutations if the states are referentially different to avoid
         * checking for conflicts unnecessarily on noops for this optimistic reducer */

        const mutated = nextOptimisticState !== optimisticState;
        nextOptimisticState.mutations = mutated ? sanitizer(nextOptimisticState) : nextOptimisticState.mutations;

        return nextOptimisticState;
    };
};
