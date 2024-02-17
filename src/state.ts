import { ReducerIdKey } from '~constants';
import type { StagedAction, TransitionAction } from '~transitions';

export type TransitionState<T> = {
    state: T;
    transitions: StagedAction[];
    [ReducerIdKey]: string;
};

type ItemIdKeys<T> = {
    [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export type StateHandlerOptions<T> = {
    itemIdKey: ItemIdKeys<T>;
    /** Given two items returns a sorting result.
     * This allows checking for valid updates or conflicts.
     * Return -1 if `a` is "smaller" than `b`
     * Return 0 if `a` equals `b`
     * Return 1 if `b` is "greater" than `a`*/
    compare: (a: T) => (b: T) => 0 | 1 | -1;
    /** Equality checker - it can potentially be different
     * than comparing. */
    eq: (a: T) => (b: T) => boolean;
};

export interface StateHandler<
    State,
    CreateParams extends any[],
    UpdateParams extends any[],
    DeleteParams extends any[],
> {
    create: (state: State, ...args: CreateParams) => State;
    update: (state: State, ...args: UpdateParams) => State;
    remove: (state: State, ...args: DeleteParams) => State;
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
    remove: (...args: DeleteParams) => State;
    merge: (incoming: State) => State;
    getState: () => State;
}

export const bindStateFactory =
    <State, CreateParams extends any[], UpdateParams extends any[], DeleteParams extends any[]>(
        handler: StateHandler<State, CreateParams, UpdateParams, DeleteParams>,
    ) =>
    (state: State): BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams> => ({
        create: (...args: CreateParams) => handler.create(state, ...args),
        update: (...args: UpdateParams) => handler.update(state, ...args),
        remove: (...args: DeleteParams) => handler.remove(state, ...args),
        merge: (incoming: State) => handler.merge(state, incoming),
        getState: () => state,
    });

export const isTransitionState = <State>(state: any): state is TransitionState<State> => ReducerIdKey in state;

type UnwrapTransitionState<T> = T extends TransitionState<any> ? T : TransitionState<T>;

export const buildTransitionState = <State>(state: State, transitions: TransitionAction[], namespace: string) => {
    const transitionState = isTransitionState<State>(state)
        ? Object.assign({}, state)
        : { state, transitions, [ReducerIdKey]: namespace };

    /* make internal properties non-enumerable to avoid consumers
     * from unintentionally accessing them when iterating */
    Object.defineProperties(transitionState, {
        transitions: { value: transitions, enumerable: false },
        [ReducerIdKey]: { value: namespace, enumerable: false },
    });

    return transitionState as UnwrapTransitionState<State>;
};

export const transitionStateFactory =
    <State>(prev: TransitionState<State>) =>
    (state: State, transitions: TransitionAction[]): TransitionState<State> => {
        if (state === prev.state && transitions === prev.transitions) return prev;
        return buildTransitionState(state, transitions, prev[ReducerIdKey]);
    };
