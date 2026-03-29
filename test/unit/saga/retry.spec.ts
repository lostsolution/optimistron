import { describe, expect, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { takeLeading } from 'redux-saga/effects';
import { createAction } from '@reduxjs/toolkit';

import { createTransitions, optimistron, getTransitionMeta } from '~index';
import { retryFailed, watchTransition } from '~saga/index';
import type { TransitionActions } from '~saga/index';
import type { TransitionState } from '~state/types';
import { createItem, indexedState, selectState } from '~test/utils';
import type { TestItem, TestIndexedState } from '~test/utils';

import { TransitionMode } from '~index';

const create = createTransitions(
    'sagaRetry::add',
    TransitionMode.DISPOSABLE,
)((item: TestItem) => ({
    payload: item,
    transitionId: item.id,
}));

const edit = createTransitions('sagaRetry::edit')((item: TestItem) => ({
    payload: item,
    transitionId: item.id,
}));

const manualReducer = (handler: any, action: any): TestIndexedState => {
    if (create.match(action)) return handler.create(action.payload);
    if (edit.match(action)) return handler.update(action.payload);
    return handler.getState();
};

const { reducer, selectors } = optimistron('sagaRetry', {} as TestIndexedState, indexedState, manualReducer);
const { selectOptimistic, selectFailures } = selectors;

type RootState = { sagaRetry: TransitionState<TestIndexedState> };

const retryAll = createAction('retry::all');
const flush = () => new Promise((r) => setTimeout(r, 50));

describe('retryFailed', () => {
    test('collects failed transitions and re-dispatches them', async () => {
        let callCount = 0;
        const effect = async () => {
            callCount++;
            if (callCount <= 1) throw new Error('fail first time');
        };

        const retry = retryFailed((state: RootState) => [state.sagaRetry], [{ selectFailures }]);

        const sagaMiddleware = createSagaMiddleware();
        const store = configureStore({
            reducer: { sagaRetry: reducer },
            middleware: (getDefault) => getDefault().concat(sagaMiddleware),
        });

        sagaMiddleware.run(function* () {
            yield* watchTransition(edit as unknown as TransitionActions<TestItem>, effect);
            yield takeLeading(retryAll.match, retry);
        });

        /** Seed committed state so edit is not a noop */
        const seed = createItem({ id: 'x', value: 'original' });
        store.dispatch(create.stage(seed));
        store.dispatch(create.commit('x'));

        const item = createItem({ id: 'x', value: 'hello' });
        store.dispatch(edit.stage(item));
        await flush();

        /** First attempt failed */
        let state = store.getState().sagaRetry;
        expect(state.transitions).toHaveLength(1);
        expect(getTransitionMeta(state.transitions[0]).failed).toBe(true);

        /** Retry — second attempt succeeds */
        store.dispatch(retryAll());
        await flush();

        state = store.getState().sagaRetry;
        expect(state.transitions).toHaveLength(0);
        expect(selectOptimistic(selectState)(state)).toEqual({ x: item });
    });

    test('handles empty failure list gracefully', async () => {
        const retry = retryFailed((state: RootState) => [state.sagaRetry], [{ selectFailures }]);

        const sagaMiddleware = createSagaMiddleware();
        const store = configureStore({
            reducer: { sagaRetry: reducer },
            middleware: (getDefault) => getDefault().concat(sagaMiddleware),
        });

        sagaMiddleware.run(function* () {
            yield takeLeading(retryAll.match, retry);
        });

        store.dispatch(retryAll());
        await flush();

        const state = store.getState().sagaRetry;
        expect(state.transitions).toHaveLength(0);
    });
});
