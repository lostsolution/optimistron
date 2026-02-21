import type { Action } from 'redux';
import type { BoundStateHandler, TransitionState } from './state';

export type BoundReducer<State = any> = (state: TransitionState<State>, action: Action) => State;

export type HandlerReducer<
    State,
    CreateParams extends unknown[],
    UpdateParams extends unknown[],
    DeleteParams extends unknown[],
> = (boundStateHandler: BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams>, action: Action) => State;

export const bindReducer =
    <S, C extends unknown[], U extends unknown[], D extends unknown[]>(
        reducer: HandlerReducer<S, C, U, D>,
        bindState: (state: S) => BoundStateHandler<S, C, U, D>,
    ): BoundReducer<S> =>
    (transitionState, action) => reducer(bindState(transitionState.state), action);
