import { REDUCER_KEY } from './constants';
import { ReducerMap } from './reducer';
import { type TransitionState } from './state';
import { getTransitionMeta, toCommit } from './transitions';

export const selectOptimistic =
    <State, Slice>(selector: (state: TransitionState<State>) => Slice) =>
    (state: TransitionState<State>): Slice => {
        const boundReducer = ReducerMap.get(state[REDUCER_KEY]);
        if (!boundReducer) return selector(state);

        const optimisticState = state.transitions.reduce(
            (acc, transition) => {
                acc.state = boundReducer(acc, toCommit(transition));
                return acc;
            },
            Object.assign({}, state),
        );

        return selector(optimisticState);
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
