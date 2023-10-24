import { getOptimisticMeta } from './actions';
import { OptimisticRefIdKey } from './constants';
import { OptimistronReducerRefs } from './optimistron';
import { isOptimisticState, type OptimisticState } from './state';

export const selectOptimistic =
    <State extends {}, Slice>(selector: (state: State) => Slice) =>
    (state: State): Slice => {
        if (isOptimisticState(state)) {
            const reducer = OptimistronReducerRefs.get(state[OptimisticRefIdKey]);
            if (!reducer) return selector(state);

            const optimisticState = state.mutations.reduce((nextState, action) => reducer(nextState, action), state);
            return selector(optimisticState);
        }

        return selector(state);
    };

export const selectFailedAction =
    (optimisticId: string) =>
    <State extends {}>({ mutations }: OptimisticState<State>) =>
        mutations.find((action) => {
            const { id, failed } = getOptimisticMeta(action);
            return id === optimisticId && failed;
        });

export const selectConflictingAction =
    (optimisticId: string) =>
    <State extends {}>({ mutations }: OptimisticState<State>) =>
        mutations.find((action) => {
            const { id, conflict } = getOptimisticMeta(action);
            return id === optimisticId && conflict;
        });

export const selectIsOptimistic =
    (optimisticId: string) =>
    <State extends {}>({ mutations }: OptimisticState<State>) =>
        mutations.some((action) => getOptimisticMeta(action).id === optimisticId);

export const selectIsFailed =
    (optimisticId: string) =>
    <State extends {}>(state: OptimisticState<State>) =>
        selectFailedAction(optimisticId)(state) !== undefined;

export const selectIsConflicting =
    (optimisticId: string) =>
    <State extends {}>(state: OptimisticState<State>) =>
        selectConflictingAction(optimisticId)(state) !== undefined;
