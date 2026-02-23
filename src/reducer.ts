import type { Action } from 'redux';
import type { BoundStateHandler, CrudActionMap, StateHandler, TransitionState } from './state/types';

export type BoundReducer<State = any> = (state: TransitionState<State>, action: Action) => State;

export type HandlerReducer<
    State,
    CreateParams extends unknown[],
    UpdateParams extends unknown[],
    DeleteParams extends unknown[],
> = (boundStateHandler: BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams>, action: Action) => State;

/** Consumer-facing reducer config: either a function (manual) or a CRUD map (auto-wired) */
export type ReducerConfig<S, C extends unknown[], U extends unknown[], D extends unknown[]> =
    | HandlerReducer<S, C, U, D>
    | (CrudActionMap & { reducer?: HandlerReducer<S, C, U, D> });

/** Runtime shape of the CRUD config branch — matches ActionMatcher's runtime interface.
 * Type-level safety is enforced at `optimistron()` call sites via overloads. */
type CrudConfigRuntime<S, C extends unknown[], U extends unknown[], D extends unknown[]> = {
    create?: { match(action: { type: string; [key: string]: unknown }): boolean };
    update?: { match(action: { type: string; [key: string]: unknown }): boolean };
    remove?: { match(action: { type: string; [key: string]: unknown }): boolean };
    reducer?: HandlerReducer<S, C, U, D>;
};

/** Runtime shape of a handler with wire — narrows after the `'wire' in handler` check */
type WiredHandler<S, C extends unknown[], U extends unknown[], D extends unknown[]> = StateHandler<S, C, U, D> & {
    wire: (
        bound: BoundStateHandler<S, C, U, D>,
        action: { type: string; [key: string]: unknown },
        actions: CrudConfigRuntime<S, C, U, D>,
    ) => S | undefined;
};

/** Resolves a `ReducerConfig` to a `HandlerReducer` — auto-wires CRUD maps via the handler's `wire` method */
export const resolveReducer = <S, C extends unknown[], U extends unknown[], D extends unknown[]>(
    handler: StateHandler<S, C, U, D>,
    config: ReducerConfig<S, C, U, D>,
): HandlerReducer<S, C, U, D> => {
    if (typeof config === 'function') return config;

    if (!('wire' in handler) || typeof handler.wire !== 'function') {
        throw new Error('optimistron: handler does not support auto-wiring (missing wire method)');
    }

    const { wire } = handler as WiredHandler<S, C, U, D>;
    const { create, update, remove, reducer: fallback } = config as CrudConfigRuntime<S, C, U, D>;

    return (bound, action) => {
        const result = wire(bound, action, { create, update, remove });
        if (result !== undefined) return result;
        if (fallback) return fallback(bound, action);
        return bound.getState();
    };
};

export const bindReducer =
    <S, C extends unknown[], U extends unknown[], D extends unknown[]>(
        reducer: HandlerReducer<S, C, U, D>,
        bindState: (state: S) => BoundStateHandler<S, C, U, D>,
    ): BoundReducer<S> =>
    (transitionState, action) =>
        reducer(bindState(transitionState.state), action);
