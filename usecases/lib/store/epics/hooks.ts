import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { selectOptimisticEpicState } from '~usecases/lib/store/epics/selectors';
import type { Epic } from '~usecases/lib/store/types';

export const useEpicState = (epic: Epic) => {
    const state = useSelector(selectOptimisticEpicState(epic.id));
    const [stashed, setStashed] = useState(false);
    const revision = useRef(epic.revision);

    useEffect(() => {
        setStashed(revision.current > epic.revision);
        revision.current = epic.revision;
    }, [epic.revision]);

    return useMemo(
        () => ({
            conflict: state.conflict,
            failed: state.failed,
            failedAction: state.retry,
            loading: state.optimistic && !state.failed,
            stashed,
        }),
        [state.optimistic, state.retry, state.failed, state.conflict, stashed],
    );
};
