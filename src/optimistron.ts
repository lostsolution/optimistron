import type { Action, Reducer } from 'redux';

import { bindReducer, resolveReducer, type BoundReducer, type HandlerReducer, type ReducerConfig } from './reducer';
import { createSelectOptimistic } from './selectors/internal';
import { bindStateFactory, buildTransitionState, transitionStateFactory } from './state/factory';
import type { StateHandler, TransitionState, WiredStateHandler } from './state/types';
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
import { warn } from './utils/logger';
import type { Maybe } from './utils/types';

/** Applies a staged transition as a commit via the bound reducer.
 * Returns undefined if no matching staged action exists. */
const commitTransition = <S>(boundReducer: BoundReducer<S>, transitionState: TransitionState<S>, transitions: StagedAction[], id: string): Maybe<S> => {
    const staged = transitions.find((entry) => id === getTransitionID(entry));
    if (!staged) return undefined;
    return boundReducer(transitionState, toCommit(staged));
};

type OptimistronResult<S> = {
    reducer: Reducer<TransitionState<S>>;
    selectOptimistic: ReturnType<typeof createSelectOptimistic<S>>;
};

type OptimistronOptions = {
    sanitizeAction?: <T extends Action>(action: T) => T;
};

/** Manual mode — full control via a reducer function */
export function optimistron<S, C, U, D>(
    namespace: string,
    initialState: S,
    handler: StateHandler<S, C, U, D>,
    config: HandlerReducer<S, C, U, D>,
    options?: OptimistronOptions,
): OptimistronResult<S>;

/** Auto-wire mode — CRUD action map routed via handler's wire method */
export function optimistron<S, C, U, D, A>(
    namespace: string,
    initialState: S,
    handler: WiredStateHandler<S, C, U, D, A>,
    config: A & { reducer?: HandlerReducer<S, C, U, D> },
    options?: OptimistronOptions,
): OptimistronResult<S>;

export function optimistron<S, C, U, D>(
    namespace: string,
    initialState: S,
    handler: StateHandler<S, C, U, D>,
    config: ReducerConfig<S, C, U, D>,
    options?: OptimistronOptions,
): OptimistronResult<S> {
    if (!namespace) throw new Error('optimistron: namespace cannot be empty');

    const reducer = resolveReducer(handler, config);
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
                    const { operation, id } = getTransitionMeta(action);
                    const nextTransitions = processTransition(options?.sanitizeAction?.(action) ?? action, transitions);

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
}
