import { OptimisticAction } from './actions';
import { OptimisticRefIdKey } from './constants';

export type OptimisticState<T> = { state: T; mutations: OptimisticAction[]; [OptimisticRefIdKey]: string };

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

export const createStateHandler =
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

export const isOptimisticState = <State>(state: any): state is OptimisticState<State> => OptimisticRefIdKey in state;

export const buildOptimisticState = <State>(
    state: State,
    mutations: OptimisticAction[],
    id: string,
): OptimisticState<State> => {
    const optimisticState = isOptimisticState<State>(state)
        ? { ...state }
        : { state, mutations, [OptimisticRefIdKey]: id };

    /* malke internal optimistic properties non-enumerable to avoid
     * consumers from unintentionally accessing them when iterating */
    Object.defineProperties(optimisticState, {
        mutations: { value: mutations, enumerable: false },
        [OptimisticRefIdKey]: { value: id, enumerable: false },
    });

    return optimisticState;
};

export const updateOptimisticState =
    <State>(prev: OptimisticState<State>) =>
    (state: State, mutations: OptimisticAction[]): OptimisticState<State> => {
        if (state === prev.state && mutations === prev.mutations) return prev;
        return buildOptimisticState(state, mutations, prev[OptimisticRefIdKey]);
    };
