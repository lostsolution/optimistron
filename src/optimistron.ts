import type { Action, Reducer } from 'redux';

import { warn } from './logger';
import { bindReducer, type BoundReducer, type HandlerReducer } from './reducer';
import { createSelectOptimistic } from './selectors';
import { bindStateFactory, buildTransitionState, transitionStateFactory } from './state';
import type { StateHandler, TransitionState } from './state.types';
import {
    Operation,
    getTransitionID,
    getTransitionMeta,
    isTransitionForNamespace,
    processTransition,
    sanitizeTransitions,
    toCommit,
    type StagedAction,
} from './transitions';

/** Applies a staged transition as a commit via the bound reducer.
 * Returns undefined if no matching staged action exists. */
const commitTransition = <S>(
    boundReducer: BoundReducer<S>,
    transitionState: TransitionState<S>,
    transitions: StagedAction[],
    id: string,
): S | undefined => {
    const staged = transitions.find((entry) => id === getTransitionID(entry));
    if (!staged) return undefined;
    return boundReducer(transitionState, toCommit(staged));
};

export const optimistron = <S, C extends unknown[], U extends unknown[], D extends unknown[]>(
    namespace: string,
    initialState: S,
    handler: StateHandler<S, C, U, D>,
    reducer: HandlerReducer<S, C, U, D>,
    options?: { sanitizeAction: <T extends Action>(action: T) => T },
): { reducer: Reducer<TransitionState<S>>; selectOptimistic: ReturnType<typeof createSelectOptimistic<S>> } => {
    if (!namespace) throw new Error('optimistron: namespace cannot be empty');

    const bindState = bindStateFactory<S, C, U, D>(handler);
    const boundReducer = bindReducer(reducer, bindState);

    const sanitizer = sanitizeTransitions(boundReducer, bindState);
    const initial = buildTransitionState(initialState, []);
    const selectOptimistic = createSelectOptimistic<S>(boundReducer, namespace);

    const optimisticReducer: Reducer<TransitionState<S>> = (transitionState = initial, action) => {
        const nextTransitionState: TransitionState<S> = (() => {
            const { state, transitions } = transitionState;
            const next = transitionStateFactory(transitionState);

            try {
                if (isTransitionForNamespace(action, namespace)) {
                    const nextTransitions = processTransition(
                        options?.sanitizeAction?.(action) ?? action,
                        transitions,
                    );
                    const { operation, id } = getTransitionMeta(action);

                    if (operation === Operation.COMMIT) {
                        const committed = commitTransition(boundReducer, transitionState, transitions, id);
                        return next(committed !== undefined ? committed : state, nextTransitions);
                    }

                    /* Every other transition actions will not be applied.
                     * If you need to get the optimistic state use the provided
                     * selectors which will apply the optimistic transitions */
                    return next(state, nextTransitions);
                }

                return next(boundReducer(transitionState, action), transitions);
            } catch (error) {
                warn(`optimistron [${namespace}]: error processing action "${action.type}"`, error);
                return next(state, transitions);
            }
        })();

        /* only sanitize the mutations if the states are referentially different to avoid
         * checking for conflicts and noops unnecessarily on the bound reducer.
         * FIXME: this should be configurable - depending on the state structure,
         * we may have to employ different strategies to check for changes */
        const mutated = nextTransitionState !== transitionState;
        nextTransitionState.transitions = mutated ? sanitizer(nextTransitionState) : nextTransitionState.transitions;

        return nextTransitionState;
    };

    return { reducer: optimisticReducer, selectOptimistic };
};
