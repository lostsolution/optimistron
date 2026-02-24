import { describe, expect, test } from 'bun:test';

import { bindStateFactory } from '~state/factory';
import { createItem, indexedState, matcher, type TestItem } from '~test/utils';
import { OptimisticMergeResult } from '~transitions';

describe('recordState', () => {
    const item = createItem();

    describe('create', () => {
        test('should add a new entry', () => {
            const next = indexedState.create({}, item);
            expect(next[item.id]).toEqual(item);
        });
    });

    describe('update', () => {
        const update = { id: item.id, value: 'newvalue', revision: 1 };

        test('should edit entry if it exists', () => {
            const next = indexedState.update({ [item.id]: item }, update);
            expect(next[item.id]).toEqual({ ...item, ...update });
        });

        test('should return state in-place otherwise', () => {
            const initial = { [item.id]: item };
            const next = indexedState.update(initial, { id: 'unknown', value: 'newvalue', revision: 1 });
            expect(next).toEqual(initial);
        });
    });

    describe('remove', () => {
        test('should delete entry if it exists', () => {
            const next = indexedState.remove({ [item.id]: item }, { id: item.id });
            expect(next).toEqual({});
        });

        test('should return state in-place otherwise', () => {
            const state = { [item.id]: item };
            const next = indexedState.remove(state, { id: 'non-existing' });
            expect(next).toEqual(state);
        });
    });

    describe('merge', () => {
        test('should allow creations', () => {
            const next = indexedState.merge({}, { [item.id]: item });
            expect(next).toEqual({ [item.id]: item });
        });

        test('should allow valid deletions', () => {
            const next = indexedState.merge({ [item.id]: item }, {});
            expect(next).toEqual({});
        });

        test('shoud allow valid updates', () => {
            const update: TestItem = { ...item, revision: 2, value: 'test-update' };
            const existing = { [item.id]: item };
            const incoming = { [item.id]: update };

            expect(indexedState.merge(existing, incoming)).toEqual(incoming);
        });

        test('should detect noops and throw `SKIP`', () => {
            const existing = { [item.id]: item };
            const incoming = { [item.id]: item };

            expect(() => indexedState.merge(existing, incoming)).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should detect conflicts throw `CONFLICT` if compare check fails', () => {
            const conflicting: TestItem = { ...item, revision: -1 };
            const existing = { [item.id]: item };
            const incoming = { [item.id]: conflicting };

            expect(() => indexedState.merge(existing, incoming)).toThrow(OptimisticMergeResult.CONFLICT);
        });

        test('should detect conflicts and throw `CONFLICT` if equality check fails', () => {
            const conflicting: TestItem = { ...item, value: 'test-conflict' };
            const existing = { [item.id]: item };
            const incoming = { [item.id]: conflicting };

            expect(() => indexedState.merge(existing, incoming)).toThrow(OptimisticMergeResult.CONFLICT);
            expect(() => indexedState.merge(incoming, existing)).toThrow(OptimisticMergeResult.CONFLICT);
        });
    });

    describe('wire', () => {
        const state = { [item.id]: item };
        const bound = bindStateFactory(indexedState)(state);

        const actions = {
            create: matcher<TestItem>('create'),
            update: matcher<Partial<TestItem>>('update'),
            remove: matcher<Partial<TestItem>>('remove'),
        };

        test('should wire create action', () => {
            const newItem = createItem({ id: 'new' });
            const result = indexedState.wire(bound, { type: 'create', payload: newItem }, actions);
            expect(result).toEqual({ ...state, new: newItem });
        });

        test('should wire update action', () => {
            const result = indexedState.wire(bound, { type: 'update', payload: { id: item.id, value: 'updated' } }, actions);
            expect(result![item.id]).toEqual({ ...item, value: 'updated' });
        });

        test('should wire remove action', () => {
            const result = indexedState.wire(bound, { type: 'remove', payload: { id: item.id } }, actions);
            expect(result).toEqual({});
        });

        test('should return undefined for unmatched actions', () => {
            const result = indexedState.wire(bound, { type: 'unknown' }, actions);
            expect(result).toBeUndefined();
        });
    });
});
