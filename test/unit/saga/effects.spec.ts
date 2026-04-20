import { describe, expect, test } from 'bun:test';
import { configureStore, createAction } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { takeEvery } from 'redux-saga/effects';

import { createTransitions, optimistron, TransitionMode, getTransitionMeta } from '~index';
import { handleTransition, retryFailed, watchTransition } from '~saga/index';
import type { TransitionState } from '~state/types';
import { createItem, indexedState, selectState } from '~test/utils';
import type { TestItem, TestIndexedState } from '~test/utils';

const create = createTransitions('sagaFx::add', TransitionMode.DISPOSABLE)((item: TestItem) => ({ payload: item, transitionId: item.id }));
const edit = createTransitions('sagaFx::edit')((item: TestItem) => ({ payload: item, transitionId: item.id }));
const remove = createTransitions('sagaFx::remove', TransitionMode.REVERTIBLE)((dto: Pick<TestItem, 'id'>) => ({ payload: dto, transitionId: dto.id }));

const manualReducer = (handler: any, action: any): TestIndexedState => {
    if (create.match(action)) return handler.create(action.payload);
    if (edit.match(action)) return handler.update(action.payload);
    if (remove.match(action)) return handler.remove(action.payload);
    return handler.getState();
};

const { reducer, selectors } = optimistron('sagaFx', {} as TestIndexedState, indexedState, manualReducer);
const { selectOptimistic, selectFailures } = selectors;

type RootState = { sagaFx: TransitionState<TestIndexedState> };

const setupStore = (saga: () => Generator) => {
    const sagaMiddleware = createSagaMiddleware();
    const store = configureStore({ reducer: { sagaFx: reducer }, middleware: (getDefault) => getDefault().concat(sagaMiddleware) });
    sagaMiddleware.run(saga);
    return store;
};

const flush = () => new Promise((r) => setTimeout(r, 50));

describe('watchTransition', () => {
    test('simple commit — effect resolves, dispatches commit', async () => {
        const effect = async () => {};
        const store = setupStore(function* () {
            yield watchTransition(create, effect);
        });

        const item = createItem({ id: 'a', value: 'hello' });
        store.dispatch(create.stage(item));
        await flush();

        const state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(0);
        expect(selectOptimistic(selectState)(state)).toEqual({ a: item });
    });

    test('amend before commit — transforms payload via amend option', async () => {
        const effect = async () => ({ serverId: 'server-123' });
        const store = setupStore(function* () {
            yield watchTransition(create, effect, {
                amend: (payload, result) => ({ ...payload, id: result.serverId }),
            });
        });

        const item = createItem({ id: 'temp', value: 'hello' });
        store.dispatch(create.stage(item));
        await flush();

        const state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(0);
        expect(selectOptimistic(selectState)(state)).toEqual({
            'server-123': { ...item, id: 'server-123' },
        });
    });

    test('fail on error — DEFAULT mode dispatches fail', async () => {
        const effect = async () => {
            throw new Error('network error');
        };
        const store = setupStore(function* () {
            yield watchTransition(edit, effect);
        });

        const seed = createItem({ id: 'a', value: 'original' });
        store.dispatch(create.stage(seed));
        store.dispatch(create.commit('a'));

        const item = createItem({ id: 'a', value: 'updated' });
        store.dispatch(edit.stage(item));
        await flush();

        const state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(1);
        expect(getTransitionMeta(state.transitions[0]).failed).toBe(true);
    });

    test('stash on error — REVERTIBLE mode dispatches stash', async () => {
        const item = createItem({ id: 'a', value: 'existing' });
        const effect = async () => {
            throw new Error('network error');
        };
        const store = setupStore(function* () {
            yield watchTransition(remove, effect);
        });

        store.dispatch(create.stage(item));
        store.dispatch(create.commit('a'));

        store.dispatch(remove.stage({ id: 'a' }));
        await flush();

        const state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(0);
        expect(selectOptimistic(selectState)(state)).toEqual({ a: item });
    });

    test('DISPOSABLE mode — fail drops the transition', async () => {
        const effect = async () => {
            throw new Error('network error');
        };
        const store = setupStore(function* () {
            yield watchTransition(create, effect);
        });

        const item = createItem({ id: 'a', value: 'hello' });
        store.dispatch(create.stage(item));
        await flush();

        const state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(0);
        expect(selectOptimistic(selectState)(state)).toEqual({});
    });
});

describe('handleTransition', () => {
    test('is independently callable as an inner generator', async () => {
        const effect = async () => {};
        const store = setupStore(function* () {
            yield takeEvery(edit.stage.match, handleTransition(edit, effect));
        });

        const seed = createItem({ id: 'b', value: 'original' });
        store.dispatch(create.stage(seed));
        store.dispatch(create.commit('b'));

        const item = createItem({ id: 'b', value: 'manual' });
        store.dispatch(edit.stage(item));
        await flush();

        const state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(0);
        expect(selectOptimistic(selectState)(state)).toEqual({ b: item });
    });
});

describe('retryFailed', () => {
    const retryAll = createAction('sagaFx::retryAll');

    test('collects failed transitions and re-dispatches them', async () => {
        let callCount = 0;
        const effect = async () => {
            callCount++;
            if (callCount <= 1) throw new Error('fail first time');
        };

        const store = setupStore(function* () {
            yield watchTransition(edit, effect);
            yield retryFailed(retryAll, (state: RootState) => selectFailures(state.sagaFx));
        });

        const seed = createItem({ id: 'x', value: 'original' });
        store.dispatch(create.stage(seed));
        store.dispatch(create.commit('x'));

        const item = createItem({ id: 'x', value: 'hello' });
        store.dispatch(edit.stage(item));
        await flush();

        let state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(1);
        expect(getTransitionMeta(state.transitions[0]).failed).toBe(true);

        store.dispatch(retryAll());
        await flush();

        state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(0);
        expect(selectOptimistic(selectState)(state)).toEqual({ x: item });
    });

    test('handles empty failure list gracefully', async () => {
        const store = setupStore(function* () {
            yield retryFailed(retryAll, (state: RootState) => selectFailures(state.sagaFx));
        });

        store.dispatch(retryAll());
        await flush();

        const state = store.getState().sagaFx;
        expect(state.transitions).toHaveLength(0);
    });
});
