import type { TransitionAction } from './transitions';
import type { BoundStateHandler, StateHandler, TransitionState } from './state.types';

export const bindStateFactory =
    <State, CreateParams extends unknown[], UpdateParams extends unknown[], DeleteParams extends unknown[]>(
        handler: StateHandler<State, CreateParams, UpdateParams, DeleteParams>,
    ) =>
    (state: State): BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams> => ({
        create: (...args: CreateParams) => handler.create(state, ...args),
        update: (...args: UpdateParams) => handler.update(state, ...args),
        remove: (...args: DeleteParams) => handler.remove(state, ...args),
        merge: (incoming: State) => handler.merge(state, incoming),
        getState: () => state,
    });

export const buildTransitionState = <State>(state: State, transitions: TransitionAction[]): TransitionState<State> => {
    const transitionState = { state } as TransitionState<State>;

    /* make transitions non-enumerable to avoid consumers
     * from unintentionally accessing them when iterating */
    Object.defineProperties(transitionState, {
        transitions: { value: transitions, enumerable: false, writable: true },
    });

    return transitionState;
};

export const transitionStateFactory =
    <State>(prev: TransitionState<State>) =>
    (state: State, transitions: TransitionAction[]): TransitionState<State> => {
        if (state === prev.state && transitions === prev.transitions) return prev;
        return buildTransitionState(state, transitions);
    };
