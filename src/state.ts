import { TransitionAction } from './actions';
import { ReducerIdKey } from './constants';

export type TransitionState<T> = { state: T; transitions: TransitionAction[]; [ReducerIdKey]: string };

export interface StateHandler<
    State,
    CreateParams extends any[],
    UpdateParams extends any[],
    DeleteParams extends any[],
> {
    create: (state: State, ...args: CreateParams) => State;
    update: (state: State, ...args: UpdateParams) => State;
    delete: (state: State, ...args: DeleteParams) => State;
    merge: (current: State, incoming: State) => State;
}

export interface BoundStateHandler<
    State,
    CreateParams extends any[],
    UpdateParams extends any[],
    DeleteParams extends any[],
> {
    create: (...args: CreateParams) => State;
    update: (...args: UpdateParams) => State;
    delete: (...args: DeleteParams) => State;
    merge: (incoming: State) => State;
    getState: () => State;
}

export const stateBinder =
    <State, CreateParams extends any[], UpdateParams extends any[], DeleteParams extends any[]>(
        handler: StateHandler<State, CreateParams, UpdateParams, DeleteParams>,
    ) =>
    (state: State): BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams> => ({
        create: (...args: CreateParams) => handler.create(state, ...args),
        update: (...args: UpdateParams) => handler.update(state, ...args),
        delete: (...args: DeleteParams) => handler.delete(state, ...args),
        merge: (incoming: State) => handler.merge(state, incoming),
        getState: () => state,
    });

export const isTransitionState = <State>(state: any): state is TransitionState<State> => ReducerIdKey in state;

export const buildTransitionState = <State>(
    state: State,
    transitions: TransitionAction[],
    namespace: string,
): TransitionState<State> => {
    const transitionState = isTransitionState<State>(state)
        ? { ...state }
        : { state, transitions, [ReducerIdKey]: namespace };

    /* make internal properties non-enumerable to avoid consumers
     * from unintentionally accessing them when iterating */
    Object.defineProperties(transitionState, {
        transitions: { value: transitions, enumerable: false },
        [ReducerIdKey]: { value: namespace, enumerable: false },
    });

    return transitionState;
};

export const updateTransitionState =
    <State>(prev: TransitionState<State>) =>
    (state: State, transitions: TransitionAction[]): TransitionState<State> => {
        if (state === prev.state && transitions === prev.transitions) return prev;
        return buildTransitionState(state, transitions, prev[ReducerIdKey]);
    };

export const cloneTransitionState = <State>(transitionState: TransitionState<State>): TransitionState<State> => ({
    ...transitionState,
});
