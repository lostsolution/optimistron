import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectOptimisticActivityState } from '~usecases/lib/store/activity/selectors';
import type { ActivityEntry } from '~usecases/lib/store/types';

export const useActivityState = (entry: ActivityEntry) => {
    const state = useSelector(selectOptimisticActivityState(entry.id));

    return useMemo(
        () => ({
            conflict: state.conflict,
            failed: state.failed,
            loading: state.optimistic && !state.failed,
        }),
        [state.optimistic, state.failed, state.conflict],
    );
};
