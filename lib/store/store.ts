import { configureStore } from '@reduxjs/toolkit';
import { type Middleware } from 'redux';

import { createOptimistronMiddlware } from '~usecases/lib/store/middleware';
import { todos } from '~usecases/lib/store/reducer';

export type State = ReturnType<ReturnType<typeof createDebugStore<Middleware>>['store']['getState']>;

export const createDebugStore = <M extends Middleware>(middleware?: M) => {
    const [debug, eventBus] = createOptimistronMiddlware();

    const store = configureStore({
        reducer: { todos },
        middleware: (mw) => mw({ thunk: true }).concat([...(middleware ? [middleware] : []), debug]),
    });

    return { store, eventBus };
};
