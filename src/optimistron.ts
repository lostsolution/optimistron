import type { Action, Reducer } from 'redux';

import { ReducerMap, bindReducer, type HandlerReducer } from './reducer';
import type { StateHandler, TransitionState } from './state';
import { bindStateFactory, buildTransitionState, transitionStateFactory } from './state';
import {
    Operation,
    getTransitionID,
    getTransitionMeta,
    isTransitionForNamespace,
    processTransition,
    sanitizeTransitions,
    toCommit,
} from './transitions';

export const optimistron = <S, C extends any[], U extends any[], D extends any[]>(
    namespace: string,
    initialState: S,
    handler: StateHandler<S, C, U, D>,
    reducer: HandlerReducer<S, C, U, D>,
    options?: { sanitizeAction: <T extends Action>(action: T) => T },
): Reducer<TransitionState<S>> => {
    const bindState = bindStateFactory<S, C, U, D>(handler);
    const boundReducer = bindReducer(reducer, bindState);

    /* keep a reference to the underlying reducer in order for optimistic
     * selectors to apply the optimistic transitions when executed */
    if (ReducerMap.has(namespace)) throw new Error(`An optimistic reducer for [${namespace}] is already registered`);
    ReducerMap.set(namespace, boundReducer);

    const sanitizer = sanitizeTransitions(boundReducer, bindState);
    const initial = buildTransitionState(initialState, [], namespace);

    return (transitionState = initial, action) => {
        const nextTransitionState: TransitionState<S> = (() => {
            const { state, transitions } = transitionState;
            const next = transitionStateFactory(transitionState);

            if (isTransitionForNamespace(action, namespace)) {
                const nextTransitions = processTransition(options?.sanitizeAction?.(action) ?? action, transitions);
                const { operation, id } = getTransitionMeta(action);

                if (operation === Operation.COMMIT) {
                    /* Find the matching staged action in the transition list.
                     * Treat it as a commit if it exists - noop otherwise */
                    const staged = transitions.find((entry) => id === getTransitionID(entry));
                    if (!staged) return next(state, nextTransitions);

                    /* Comitting will apply the action to the reducer */
                    return next(boundReducer(transitionState, toCommit(staged)), nextTransitions);
                }

                /* Every other transition actions will not be applied.
                 * If you need to get the optimistic state use the provided
                 * selectors which will apply the optimistic transitions */
                return next(state, nextTransitions);
            }

            return next(boundReducer(transitionState, action), transitions);
        })();

        /* only sanitize the mutations if the states are referentially different to avoid
         * checking for conflicts and noops unnecessarily on the bound reducer */
        const mutated = nextTransitionState !== transitionState;
        nextTransitionState.transitions = mutated ? sanitizer(nextTransitionState) : nextTransitionState.transitions;

        return nextTransitionState;
    };
};
