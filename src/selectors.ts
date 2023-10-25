import { OptimisticOperation, getOptimisticMeta, updateAction } from './actions';
import { OptimisticRefIdKey } from './constants';
import { OptimistronReducerRefs } from './reducer';
import { cloneOptimisticState, type OptimisticState } from './state';

export const selectOptimistic =
    <State, Slice>(selector: (state: OptimisticState<State>) => Slice) =>
    (state: OptimisticState<State>): Slice => {
        const boundReducer = OptimistronReducerRefs.get(state[OptimisticRefIdKey]);
        if (!boundReducer) return selector(state);

        const optimisticState = state.mutations.reduce((acc, action) => {
            acc.state = boundReducer(acc, updateAction(action, { operation: OptimisticOperation.COMMIT }));
            return acc;
        }, cloneOptimisticState(state));

        return selector(optimisticState);
    };

export const selectFailedAction =
    (optimisticId: string) =>
    <State>({ mutations }: OptimisticState<State>) => {
        const failedAction = mutations.find((action) => {
            const { id, failed } = getOptimisticMeta(action);
            return id === optimisticId && failed;
        });

        if (failedAction) return updateAction(failedAction, { operation: OptimisticOperation.STAGE, failed: false });
    };

export const selectConflictingAction =
    (optimisticId: string) =>
    <State>({ mutations }: OptimisticState<State>) =>
        mutations.find((action) => {
            const { id, conflict } = getOptimisticMeta(action);
            return id === optimisticId && conflict;
        });

export const selectIsOptimistic =
    (optimisticId: string) =>
    <State>({ mutations }: OptimisticState<State>) =>
        mutations.some((action) => getOptimisticMeta(action).id === optimisticId);

export const selectIsFailed =
    (optimisticId: string) =>
    <State>(state: OptimisticState<State>) =>
        selectFailedAction(optimisticId)(state) !== undefined;

export const selectIsConflicting =
    (optimisticId: string) =>
    <State>(state: OptimisticState<State>) =>
        selectConflictingAction(optimisticId)(state) !== undefined;
