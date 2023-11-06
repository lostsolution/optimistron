import { TransitionOperation, getTransitionMeta, updateTransition } from './actions';
import { ReducerIdKey } from './constants';
import { ReducerMap } from './reducer';
import { cloneTransitionState, type TransitionState } from './state';

export const selectOptimistic =
    <State, Slice>(selector: (state: TransitionState<State>) => Slice) =>
    (state: TransitionState<State>): Slice => {
        const boundReducer = ReducerMap.get(state[ReducerIdKey]);
        if (!boundReducer) return selector(state);

        const optimisticState = state.transitions.reduce((acc, action) => {
            acc.state = boundReducer(acc, updateTransition(action, { operation: TransitionOperation.COMMIT }));
            return acc;
        }, cloneTransitionState(state));

        return selector(optimisticState);
    };

export const selectFailedAction =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>) => {
        const failedAction = transitions.find((action) => {
            const { id, failed } = getTransitionMeta(action);
            return id === transitionId && failed;
        });

        if (failedAction)
            return updateTransition(failedAction, { operation: TransitionOperation.STAGE, failed: false });
    };

export const selectConflictingAction =
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
        selectFailedAction(transitionId)(state) !== undefined;

export const selectIsConflicting =
    (transitionId: string) =>
    <State>(state: TransitionState<State>) =>
        selectConflictingAction(transitionId)(state) !== undefined;
