import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import type { StagedAction } from '~transitions';

import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';
import { selectAllFailedTransitions } from '~usecases/lib/store/epics/selectors';

/** Retries all failed transitions when coming back online.
 *  The `retry` callback is pattern-specific:
 *  - Basic/Thunks: routes each action to the correct handler/thunk
 *  - Sagas: re-dispatches the stage action (saga watcher picks it up) */
export const useAutoRetry = (retry: (action: StagedAction) => void) => {
    const { online } = useMockApi();
    const failedTransitions = useSelector(selectAllFailedTransitions);
    const retryRef = useRef(retry);
    retryRef.current = retry;

    useEffect(() => {
        if (online) failedTransitions.forEach((a) => retryRef.current(a));
    }, [online, failedTransitions]);
};
