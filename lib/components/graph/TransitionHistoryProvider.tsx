import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import type { TransitionAction } from '~transitions';
import { Operation, getTransitionMeta } from '~transitions';

import type { TransitionEventBus } from '~usecases/lib/store/middleware';
import { selectTransitions } from '~usecases/lib/store/selectors';

type Props = PropsWithChildren<{ eventBus: TransitionEventBus }>;
type TransitionHistoryContextType = { committed: TransitionAction[]; staged: TransitionAction[] };

const TransitionHistoryContext = createContext<TransitionHistoryContextType>({ committed: [], staged: [] });

export const TransitionHistoryProvider: FC<Props> = ({ children, eventBus }) => {
    const [committed, setCommitted] = useState<TransitionAction[]>([]);
    const staged = useSelector(selectTransitions);

    useEffect(
        () =>
            eventBus.subscribe((transition) => {
                setCommitted((history) => {
                    const meta = getTransitionMeta(transition);
                    if (meta.operation === Operation.COMMIT) return [...history, transition];
                    return history;
                });
            }),
        [],
    );

    const value = useMemo(() => ({ staged, committed }), [staged, committed]);

    return <TransitionHistoryContext.Provider value={value}>{children}</TransitionHistoryContext.Provider>;
};

export const useTransitionHistory = () => useContext(TransitionHistoryContext);
