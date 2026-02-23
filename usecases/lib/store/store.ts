import { configureStore } from '@reduxjs/toolkit';
import { type Middleware } from 'redux';

import { activity } from '~usecases/lib/store/activity/reducer';
import { epics } from '~usecases/lib/store/epics/reducer';
import { createOptimistronMiddlware } from '~usecases/lib/store/middleware';
import { profile } from '~usecases/lib/store/profile/reducer';
import { projects } from '~usecases/lib/store/projects/reducer';

export type State = ReturnType<ReturnType<typeof createDebugStore<Middleware>>['store']['getState']>;

export const createDebugStore = <M extends Middleware>(middleware?: M) => {
    const [debug, eventBus] = createOptimistronMiddlware();

    const store = configureStore({
        reducer: { epics, profile, projects, activity },
        middleware: (mw) => mw({ thunk: true }).concat([...(middleware ? [middleware] : []), debug]),
    });

    return { store, eventBus };
};
