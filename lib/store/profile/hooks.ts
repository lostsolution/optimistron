import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectOptimisticProfileState } from '~usecases/lib/store/profile/selectors';

export const useProfileState = () => {
    const state = useSelector(selectOptimisticProfileState);

    return useMemo(
        () => ({
            conflict: state.conflict,
            failed: state.failed,
            loading: state.optimistic && !state.failed,
        }),
        [state.optimistic, state.failed, state.conflict],
    );
};
