import type { Action } from '@reduxjs/toolkit';
import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import type { TransitionAction } from '~transitions';
import { Operation, getTransitionMeta, isTransition } from '~transitions';

import { sync } from '~usecases/lib/store/actions';
import type { TransitionEventBus } from '~usecases/lib/store/middleware';
import { selectTransitions } from '~usecases/lib/store/selectors';

type Props = PropsWithChildren<{ eventBus: TransitionEventBus }>;
type TransitionHistoryContextType = { committed: Action[]; staged: TransitionAction[] };

const TransitionHistoryContext = createContext<TransitionHistoryContextType>({ committed: [], staged: [] });

export const TransitionHistoryProvider: FC<Props> = ({ children, eventBus }) => {
    const [committed, setCommitted] = useState<Action[]>([]);
    const staged = useSelector(selectTransitions);

    useEffect(
        () =>
            eventBus.subscribe((action) => {
                setCommitted((history) => {
                    if (isTransition(action)) {
                        const meta = getTransitionMeta(action);
                        if (meta.operation === Operation.COMMIT) return [...history, action];
                    }
                    if (sync.match(action)) return [...history, action];
                    return history;
                });
            }),
        [],
    );

    const value = useMemo(() => ({ staged, committed }), [staged, committed]);

    return <TransitionHistoryContext.Provider value={value}>{children}</TransitionHistoryContext.Provider>;
};

export const useTransitionHistory = () => useContext(TransitionHistoryContext);
