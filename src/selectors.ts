import { warn } from './logger';
import type { BoundReducer } from './reducer';
import { type TransitionState } from './state';
import { getTransitionMeta, toCommit } from './transitions';

/** Creates a `selectOptimistic` selector closed over the bound reducer.
 * Used internally by `optimistron()` — not part of the public API. */
export const createSelectOptimistic =
    <State>(boundReducer: BoundReducer<State>, namespace: string) =>
    <Slice>(selector: (state: TransitionState<State>) => Slice) =>
    (state: TransitionState<State>): Slice => {
        /** Fast-path: no transitions to replay */
        if (!state.transitions.length) return selector(state);

        try {
            const optimisticState = state.transitions.reduce(
                (acc, transition) => {
                    acc.state = boundReducer(acc, toCommit(transition));
                    return acc;
                },
                Object.assign({}, state),
            );

            return selector(optimisticState);
        } catch (error) {
            warn(`selectOptimistic: error replaying transitions for "${namespace}"`, error);
            return selector(state);
        }
    };

export const selectFailedTransitions = <State>({ transitions }: TransitionState<State>) =>
    transitions.filter((action) => getTransitionMeta(action).failed);

export const selectFailedTransition =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.find((action) => {
            const { id, failed } = getTransitionMeta(action);
            return id === transitionId && failed;
        });

export const selectConflictingTransition =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.find((action) => {
            const { id, conflict } = getTransitionMeta(action);
            return id === transitionId && conflict;
        });

export const selectIsOptimistic =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.some((action) => getTransitionMeta(action).id === transitionId);

export const selectIsFailed =
    (transitionId: string) =>
    <State>(state: TransitionState<State>) =>
        selectFailedTransition(transitionId)(state) !== undefined;

export const selectIsConflicting =
    (transitionId: string) =>
    <State>(state: TransitionState<State>) =>
        selectConflictingTransition(transitionId)(state) !== undefined;
