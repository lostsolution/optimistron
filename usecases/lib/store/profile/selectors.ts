import { createSelector } from '@reduxjs/toolkit';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic, selectFailedTransition } from '~selectors/selectors';
import { selectOptimistic } from '~usecases/lib/store/profile/reducer';
import type { State } from '~usecases/lib/store/store';

export const selectOptimisticProfile = createSelector(
    (state: State) => state.profile,
    selectOptimistic((profile) => profile.state),
);

export const selectOptimisticProfileState = createSelector(
    (state: State) => state.profile,
    (profile) => ({
        optimistic: selectIsOptimistic('profile')(profile),
        failed: selectIsFailed('profile')(profile),
        retry: selectFailedTransition('profile')(profile),
        conflict: selectIsConflicting('profile')(profile),
    }),
);
