import type { TransitionAction } from '~/transitions';
import type { BoundStateHandler, StateHandler, TransitionState } from './types';

export const bindStateFactory =
    <S, C, U, D>(handler: StateHandler<S, C, U, D>) =>
    (state: S): BoundStateHandler<S, C, U, D> => ({
        create: (dto: C) => handler.create(state, dto),
        update: (dto: U) => handler.update(state, dto),
        remove: (dto: D) => handler.remove(state, dto),
        merge: (incoming: S) => handler.merge(state, incoming),
        getState: () => state,
    });

export const buildTransitionState = <S>(state: S, transitions: TransitionAction[]): TransitionState<S> => {
    const transitionState = { committed: state } as TransitionState<S>;

    /* make transitions non-enumerable to avoid consumers
     * from unintentionally accessing them when iterating */
    Object.defineProperties(transitionState, {
        transitions: {
            value: transitions,
            enumerable: false,
            writable: true,
        },
    });

    return transitionState;
};

export const transitionStateFactory =
    <S>(prev: TransitionState<S>) =>
    (state: S, transitions: TransitionAction[]): TransitionState<S> => {
        if (state === prev.committed && transitions === prev.transitions) return prev;
        return buildTransitionState(state, transitions);
    };
