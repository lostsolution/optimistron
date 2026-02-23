import { createSelector } from '@reduxjs/toolkit';
import { selectFailedTransition, selectIsConflicting, selectIsFailed, selectIsOptimistic } from '~selectors/selectors';
import { selectOptimistic } from '~usecases/lib/store/activity/reducer';
import type { State } from '~usecases/lib/store/store';

export const selectOptimisticActivity = createSelector(
    (state: State) => state.activity,
    selectOptimistic((activity) => [...activity.state].sort((a, b) => b.timestamp - a.timestamp)),
);

export const selectOptimisticActivityState = (id: string) =>
    createSelector(
        (state: State) => state.activity,
        (activity) => ({
            optimistic: selectIsOptimistic(id)(activity),
            failed: selectIsFailed(id)(activity),
            retry: selectFailedTransition(id)(activity),
            conflict: selectIsConflicting(id)(activity),
        }),
    );
