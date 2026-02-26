import { createSelector } from '@reduxjs/toolkit';
import { activitySelectors } from '~usecases/lib/store/activity/reducer';
import type { State } from '~usecases/lib/store/store';

const { selectOptimistic, selectIsOptimistic, selectIsFailed, selectIsConflicting } = activitySelectors;

export const selectOptimisticActivity = createSelector(
    (state: State) => state.activity,
    selectOptimistic((activity) => [...activity.committed].sort((a, b) => b.timestamp - a.timestamp)),
);

export const selectOptimisticActivityState = (id: string) =>
    createSelector(
        (state: State) => state.activity,
        (activity) => ({
            optimistic: selectIsOptimistic(id)(activity),
            failed: selectIsFailed(id)(activity),
            conflict: selectIsConflicting(id)(activity),
        }),
    );
