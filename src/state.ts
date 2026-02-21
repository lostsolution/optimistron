import type { StagedAction, TransitionAction } from './transitions';

export type TransitionState<T> = {
    state: T;
    transitions: StagedAction[];
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
    CreateParams extends unknown[],
    UpdateParams extends unknown[],
    DeleteParams extends unknown[],
> {
    create: (state: State, ...args: CreateParams) => State;
    update: (state: State, ...args: UpdateParams) => State;
    remove: (state: State, ...args: DeleteParams) => State;
    merge: (current: State, incoming: State) => State;
}

export interface BoundStateHandler<
    State,
    CreateParams extends unknown[],
    UpdateParams extends unknown[],
    DeleteParams extends unknown[],
> {
    create: (...args: CreateParams) => State;
    update: (...args: UpdateParams) => State;
    remove: (...args: DeleteParams) => State;
    merge: (incoming: State) => State;
    getState: () => State;
}

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
