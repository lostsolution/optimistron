import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Store } from 'redux';

import { sync } from '~usecases/lib/store/actions';
import { getMockApiOnline, getMockApiTimeout, setMockApiOnline, setMockApiTimeout } from '~usecases/lib/utils/mock-api';

type MockApiState = { online: boolean; timeout: number; store?: Store };

type MockApiContextType = MockApiState & {
    setResponseTime: (ms: number) => void;
    setStore: (store: Store) => void;
    sync: () => void;
    toggleOnline: () => void;
};

const MockApiContext = createContext<MockApiContextType | null>(null);

export const MockApiProvider: FC<PropsWithChildren> = ({ children }) => {
    const [state, setState] = useState<MockApiState>({ online: getMockApiOnline(), timeout: getMockApiTimeout() });

    useEffect(() => {
        setMockApiOnline(state.online);
        setMockApiTimeout(state.timeout);
    }, [state]);

    return (
        <MockApiContext.Provider
            value={useMemo<MockApiContextType>(
                () => ({
                    ...state,
                    setResponseTime: (timeout) => setState((prev) => ({ ...prev, timeout })),
                    setStore: (store) => setState((prev) => ({ ...prev, store })),
                    sync: () => state.store?.dispatch(sync()),
                    toggleOnline: () => setState((prev) => ({ ...prev, online: !prev.online })),
                }),
                [state],
            )}
        >
            {children}
        </MockApiContext.Provider>
    );
};

export const useMockApi = () => {
    const ctx = useContext(MockApiContext);
    if (!ctx) throw new Error();
    return ctx;
};
