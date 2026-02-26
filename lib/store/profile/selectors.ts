import { createSelector } from '@reduxjs/toolkit';
import { profileSelectors } from '~usecases/lib/store/profile/reducer';
import type { State } from '~usecases/lib/store/store';

const { selectOptimistic, selectIsOptimistic, selectIsFailed, selectIsConflicting } = profileSelectors;

export const selectOptimisticProfile = createSelector(
    (state: State) => state.profile,
    selectOptimistic((profile) => profile.committed),
);

export const selectOptimisticProfileState = createSelector(
    (state: State) => state.profile,
    (profile) => ({
        optimistic: selectIsOptimistic('profile')(profile),
        failed: selectIsFailed('profile')(profile),
        conflict: selectIsConflicting('profile')(profile),
    }),
);
