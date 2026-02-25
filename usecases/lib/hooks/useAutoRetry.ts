import { useEffect, useRef } from 'react';

import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';

/** Calls `onReconnect` exactly once on the offline → online transition.
 *  The retry strategy (what to dispatch) is the caller's concern. */
export const useAutoRetry = (onReconnect: () => void) => {
    const { online } = useMockApi();
    const wasOnline = useRef(online);
    const onReconnectRef = useRef(onReconnect);
    onReconnectRef.current = onReconnect;

    useEffect(() => {
        if (online && !wasOnline.current) onReconnectRef.current();
        wasOnline.current = online;
    }, [online]);
};
