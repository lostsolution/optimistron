import { AnyAction } from 'redux';
import { BoundStateHandler, OptimisticState } from './state';

export type BoundReducer<State = any> = (state: OptimisticState<State>, action: AnyAction) => State;

export type HandlerReducer<
    State,
    CreateParams extends any[],
    UpdateParams extends any[],
    DeleteParams extends any[],
> = (boundStateHandler: BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams>, action: AnyAction) => State;

export const OptimistronReducerRefs = new Map<string, BoundReducer>();

export const bindReducer =
    <S, C extends any[], U extends any[], D extends any[]>(
        reducer: HandlerReducer<S, C, U, D>,
        bindState: (state: S) => BoundStateHandler<S, C, U, D>,
    ): BoundReducer<S> =>
    (optimisticState, action) =>
        reducer(bindState(optimisticState.state), action);
