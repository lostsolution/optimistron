import { configureStore } from '@reduxjs/toolkit';
import { combineReducers, type Middleware } from 'redux';

import { createOptimistronMiddlware } from '~usecases/lib/store/middleware';
import { todos } from '~usecases/lib/store/reducer';

export type State = ReturnType<ReturnType<typeof createDebugStore>['store']['getState']>;

export const createDebugStore = <M extends Middleware>(middleware?: M) => {
    const [debug, eventBus] = createOptimistronMiddlware();

    const store = configureStore({
        reducer: combineReducers({ todos }),
        middleware: (mw) => mw({ thunk: true }).concat([...(middleware ? [middleware] : []), debug] as Middleware[]),
    });

    store.dispatch;

    return { store, eventBus };
};
