import { AnyAction, Reducer } from 'redux';
import { OPTIMISTRON_INIT, getOptimisticMeta, isOptimisticActionForNamespace } from './actions';
import { processMutation, sanitizeMutations } from './mutations';
import { StateHandler, buildOptimisticState, createStateHandler, updateOptimisticState } from './state';
import { BoundReducer, OptimisticOperation, OptimisticState } from './types';
import { generateId } from './utils';

export const OptimistronReducerRefs = new Map<string, Reducer>();

export const optimistron = <S extends {}, C extends any[], U extends any[], D extends any[]>(
    namespace: string,
    initialState: S,
    handler: StateHandler<S, C, U, D>,
    boundReducer: BoundReducer<AnyAction, S, C, U, D>,
): Reducer<OptimisticState<S>> => {
    /* keep a reference to the underlying reducer in order for
     * optimistic selectors to apply the optimistic mutations when
     * triggered */
    const reducerId = generateId();
    OptimistronReducerRefs.set(reducerId, boundReducer);

    const bindHandler = createStateHandler<S, C, U, D>(handler);
    const sanitizer = sanitizeMutations(boundReducer, bindHandler);

    const initial: OptimisticState<S> = buildOptimisticState(
        boundReducer(bindHandler(initialState), OPTIMISTRON_INIT),
        [],
        reducerId,
    );

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
                        const comittedState = boundReducer(bindHandler(state), action);
                        return next(comittedState, nextMutations);
                    default:
                        /* every other optimistic action are not applied to the
                         * state, if you need to get the optimistic state use the
                         * provided selectors which will apply the optimistic mutations */
                        return next(state, nextMutations);
                }
            }

            return next(boundReducer(bindHandler(state), action), mutations);
        })();

        const mutated = nextOptimisticState !== optimisticState;
        nextOptimisticState.mutations = mutated ? sanitizer(nextOptimisticState) : nextOptimisticState.mutations;

        return nextOptimisticState;
    };
};
