import { describe, expect, test } from 'bun:test';

import { createItem, indexedState, type TestItem } from '~test/utils';
import { OptimisticMergeResult } from '~transitions';

describe('IndexedState', () => {
    const item = createItem();

    describe('create', () => {
        test('should add a new entry', () => {
            const next = indexedState.create({}, item);
            expect(next[item.id]).toEqual(item);
        });
    });

    describe('update', () => {
        const update: Partial<TestItem> = { value: 'newvalue', revision: 1 };

        test('should edit entry if it exists', () => {
            const next = indexedState.update({ [item.id]: item }, item.id, update);
            expect(next[item.id]).toEqual({ ...item, ...update });
        });

        test('should return state in-place otherwise', () => {
            const initial = { [item.id]: item };
            const next = indexedState.update(initial, 'unknown', update);
            expect(next).toEqual(initial);
        });
    });

    describe('remove', () => {
        test('should delete entry if it exists', () => {
            const next = indexedState.remove({ [item.id]: item }, item.id);
            expect(next).toEqual({});
        });

        test('should return state in-place otherwise', () => {
            const state = { [item.id]: item };
            const next = indexedState.remove(state, 'non-existing');
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
});
