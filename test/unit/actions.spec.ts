import { describe, expect, test } from 'bun:test';

import { createTransitions, crudPrepare, resolveTransition } from '~actions';
import { META_KEY } from '~constants';
import { TransitionMode, Operation } from '~transitions';

describe('resolveTransition', () => {
    const prepare = (id: string, value: string) => ({
        payload: { id, value },
        transitionId: id,
    });

    describe('STAGE operation', () => {
        const resolve = resolveTransition(Operation.STAGE, TransitionMode.DEFAULT)(prepare);

        test('auto-detects transitionId from prepare result', () => {
            const result = resolve('item-1', 'hello');

            expect(result.payload).toEqual({ id: 'item-1', value: 'hello' });
            expect(result.meta[META_KEY]).toEqual({ id: 'item-1', operation: Operation.STAGE, mode: TransitionMode.DEFAULT });
        });

        test('falls back to explicit transitionId when prepare omits it', () => {
            const plainPrepare = (value: string) => ({ payload: { value } });
            const resolve = resolveTransition(Operation.STAGE, TransitionMode.DEFAULT)(plainPrepare);
            const result = resolve('tid-1', 'hello');

            expect(result.payload).toEqual({ value: 'hello' });
            expect(result.meta[META_KEY].id).toBe('tid-1');
        });
    });

    describe('non-STAGE operations', () => {
        test('AMEND always uses explicit transitionId even when prepare returns transitionId', () => {
            const resolve = resolveTransition(Operation.AMEND, TransitionMode.DEFAULT)(prepare);
            const result = resolve('original-tid', 'server-id', 'hello');

            expect(result.payload).toEqual({ id: 'server-id', value: 'hello' });
            expect(result.meta[META_KEY]).toEqual({ id: 'original-tid', operation: Operation.AMEND, mode: TransitionMode.DEFAULT });
        });

        test('COMMIT always uses explicit transitionId', () => {
            const commitPrepare = () => ({ payload: {} });
            const resolve = resolveTransition(Operation.COMMIT, TransitionMode.DEFAULT)(commitPrepare);
            const result = resolve('tid-1');

            expect(result.meta[META_KEY].id).toBe('tid-1');
            expect(result.meta[META_KEY].operation).toBe(Operation.COMMIT);
        });

        test('FAIL always uses explicit transitionId', () => {
            const failPrepare = (error: unknown) => ({ payload: {}, error });
            const resolve = resolveTransition(Operation.FAIL, TransitionMode.DEFAULT)(failPrepare);
            const result = resolve('tid-1', new Error('test'));

            expect(result.meta[META_KEY].id).toBe('tid-1');
            expect(result.meta[META_KEY].operation).toBe(Operation.FAIL);
        });
    });

    test('respects transition mode', () => {
        const resolve = resolveTransition(Operation.STAGE, TransitionMode.REVERTIBLE)(prepare);
        const result = resolve('item-1', 'hello');

        expect(result.meta[META_KEY].mode).toBe(TransitionMode.REVERTIBLE);
    });
});

describe('createTransitions', () => {
    describe('with auto transitionId prepare', () => {
        const prepare = (id: string, value: string) => ({
            payload: { id, value },
            transitionId: id,
        });

        const actions = createTransitions('ns::test')(prepare);

        test('stage should extract transitionId from prepare result', () => {
            const result = actions.stage('item-1', 'hello');

            expect(result.payload).toEqual({ id: 'item-1', value: 'hello' });
            expect(result.meta[META_KEY].id).toBe('item-1');
            expect(result.meta[META_KEY].operation).toBe(Operation.STAGE);
        });

        test('amend should use explicit transitionId as first arg', () => {
            const result = actions.amend('original-tid', 'server-id', 'updated');

            expect(result.payload).toEqual({ id: 'server-id', value: 'updated' });
            expect(result.meta[META_KEY].id).toBe('original-tid');
            expect(result.meta[META_KEY].operation).toBe(Operation.AMEND);
        });

        test('commit/fail/stash should still use transitionId as first arg (default preparators)', () => {
            const commitResult = actions.commit('item-1');
            expect(commitResult.meta[META_KEY].id).toBe('item-1');
            expect(commitResult.meta[META_KEY].operation).toBe(Operation.COMMIT);

            const failResult = actions.fail('item-1', new Error('test'));
            expect(failResult.meta[META_KEY].id).toBe('item-1');
            expect(failResult.meta[META_KEY].operation).toBe(Operation.FAIL);

            const stashResult = actions.stash('item-1');
            expect(stashResult.meta[META_KEY].id).toBe('item-1');
            expect(stashResult.meta[META_KEY].operation).toBe(Operation.STASH);
        });
    });

    describe('backwards compatibility', () => {
        const prepare = (value: string) => ({ payload: { value } });
        const actions = createTransitions('ns::compat')(prepare);

        test('should accept transitionId as first arg when prepare does not return it', () => {
            const result = actions.stage('tid-1', 'hello');

            expect(result.payload).toEqual({ value: 'hello' });
            expect(result.meta[META_KEY].id).toBe('tid-1');
            expect(result.meta[META_KEY].operation).toBe(Operation.STAGE);
        });
    });

    describe('with options object and mixed preparators', () => {
        const stagePA = (id: string, value: string) => ({
            payload: { id, value },
            transitionId: id,
        });

        const commitPA = (id: string, serverData: string) => ({
            payload: { id, serverData },
            transitionId: id,
        });

        const actions = createTransitions('ns::mixed')({
            stage: stagePA,
            commit: commitPA,
        });

        test('stage uses auto transitionId', () => {
            const result = actions.stage('item-1', 'hello');
            expect(result.meta[META_KEY].id).toBe('item-1');
            expect(result.payload).toEqual({ id: 'item-1', value: 'hello' });
        });

        test('commit uses explicit transitionId as first arg', () => {
            const result = actions.commit('tid-1', 'item-1', 'server-response');
            expect(result.meta[META_KEY].id).toBe('tid-1');
            expect(result.payload).toEqual({ id: 'item-1', serverData: 'server-response' });
        });
    });
});

describe('crudPrepare', () => {
    describe('single-key', () => {
        type Item = { id: string; name: string; revision: number };
        const crud = crudPrepare<Item>('id');

        test('create returns payload with item and transitionId', () => {
            const item: Item = { id: 'i1', name: 'test', revision: 0 };
            const result = crud.create(item);

            expect(result.payload).toEqual(item);
            expect(result.transitionId).toBe('i1');
        });

        test('update returns payload with dto and transitionId', () => {
            const result = crud.update({ id: 'i1', name: 'updated' });

            expect(result.payload).toEqual({ id: 'i1', name: 'updated' });
            expect(result.transitionId).toBe('i1');
        });

        test('remove returns payload with dto and transitionId', () => {
            const result = crud.remove({ id: 'i1' });

            expect(result.payload).toEqual({ id: 'i1' });
            expect(result.transitionId).toBe('i1');
        });

        test('composes with createTransitions', () => {
            const actions = createTransitions('items::add')(crud.create);
            const item: Item = { id: 'i1', name: 'test', revision: 0 };
            const result = actions.stage(item);

            expect(result.payload).toEqual(item);
            expect(result.meta[META_KEY].id).toBe('i1');
            expect(result.meta[META_KEY].operation).toBe(Operation.STAGE);
        });

        test('composes with createTransitions using REVERTIBLE mode', () => {
            const actions = createTransitions('items::del', TransitionMode.REVERTIBLE)(crud.remove);
            const result = actions.stage({ id: 'i1' });

            expect(result.payload).toEqual({ id: 'i1' });
            expect(result.meta[META_KEY].id).toBe('i1');
            expect(result.meta[META_KEY].mode).toBe(TransitionMode.REVERTIBLE);
        });

        test('uses numeric id key converted to string', () => {
            type NumItem = { code: number; label: string };
            const numCrud = crudPrepare<NumItem>('code');
            const result = numCrud.create({ code: 42, label: 'test' });

            expect(result.transitionId).toBe('42');
        });
    });

    describe('multi-key', () => {
        type Item = { groupId: string; itemId: string; value: string };
        const crud = crudPrepare<Item>()(['groupId', 'itemId']);

        test('create derives transitionId by joining path IDs with /', () => {
            const item: Item = { groupId: 'g1', itemId: 'i1', value: 'test' };
            const result = crud.create(item);

            expect(result.payload).toEqual(item);
            expect(result.transitionId).toBe('g1/i1');
        });

        test('update returns payload with dto', () => {
            const result = crud.update({ groupId: 'g1', itemId: 'i1', value: 'updated' });

            expect(result.payload).toEqual({ groupId: 'g1', itemId: 'i1', value: 'updated' });
            expect(result.transitionId).toBe('g1/i1');
        });

        test('remove returns payload with dto', () => {
            const result = crud.remove({ groupId: 'g1', itemId: 'i1' });

            expect(result.payload).toEqual({ groupId: 'g1', itemId: 'i1' });
            expect(result.transitionId).toBe('g1/i1');
        });

        test('composes with createTransitions', () => {
            const actions = createTransitions('nested::add')(crud.create);
            const item: Item = { groupId: 'g1', itemId: 'i1', value: 'test' };
            const result = actions.stage(item);

            expect(result.payload).toEqual(item);
            expect(result.meta[META_KEY].id).toBe('g1/i1');
            expect(result.meta[META_KEY].operation).toBe(Operation.STAGE);
        });

        test('works with 3-level nesting', () => {
            type Deep = { a: string; b: string; c: string; val: number };
            const deepCrud = crudPrepare<Deep>()(['a', 'b', 'c']);
            const item: Deep = { a: 'x', b: 'y', c: 'z', val: 1 };

            expect(deepCrud.create(item).transitionId).toBe('x/y/z');
            expect(deepCrud.update({ a: 'x', b: 'y', c: 'z', val: 2 }).transitionId).toBe('x/y/z');
            expect(deepCrud.remove({ a: 'x', b: 'y', c: 'z' }).transitionId).toBe('x/y/z');
        });
    });
});
