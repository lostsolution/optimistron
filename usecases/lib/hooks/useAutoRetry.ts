import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import type { TransitionAction } from '~transitions';

import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';
import { selectAllFailedTransitions } from '~usecases/lib/store/epics/selectors';

/** Retries all failed transitions when coming back online.
 *  `retry` is called with each failed stage action — the App-level
 *  handler routes it through the correct lifecycle (component async,
 *  thunk, or saga re-dispatch). */
export const useAutoRetry = (retry: (action: TransitionAction) => void) => {
    const { online } = useMockApi();
    const failedTransitions = useSelector(selectAllFailedTransitions);
    const retryRef = useRef(retry);
    retryRef.current = retry;

    useEffect(() => {
        if (online) failedTransitions.forEach((a) => retryRef.current(a));
    }, [online, failedTransitions]);
};
