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
    (optimisticId: string) =>
    <State>({ transitions }: TransitionState<State>) => {
        const failedAction = transitions.find((action) => {
            const { id, failed } = getTransitionMeta(action);
            return id === optimisticId && failed;
        });

        if (failedAction)
            return updateTransition(failedAction, { operation: TransitionOperation.STAGE, failed: false });
    };

export const selectConflictingAction =
    (optimisticId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.find((action) => {
            const { id, conflict } = getTransitionMeta(action);
            return id === optimisticId && conflict;
        });

export const selectIsOptimistic =
    (optimisticId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.some((action) => getTransitionMeta(action).id === optimisticId);

export const selectIsFailed =
    (optimisticId: string) =>
    <State>(state: TransitionState<State>) =>
        selectFailedAction(optimisticId)(state) !== undefined;

export const selectIsConflicting =
    (optimisticId: string) =>
    <State>(state: TransitionState<State>) =>
        selectConflictingAction(optimisticId)(state) !== undefined;
