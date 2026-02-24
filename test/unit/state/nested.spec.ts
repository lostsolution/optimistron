import { describe, expect, test } from 'bun:test';

import { bindStateFactory } from '~state/factory';
import { matcher } from '~test/utils';
import { nestedRecordState } from '~state/record';
import { OptimisticMergeResult } from '~transitions';

type Item = { groupId: string; itemId: string; value: string; revision: number };

const handler = nestedRecordState<Item>()({
    keys: ['groupId', 'itemId'],
    compare: (a) => (b) => {
        if (a.revision > b.revision) return 1;
        if (a.revision === b.revision) return 0;
        return -1;
    },
    eq: (a) => (b) => a.value === b.value,
});

describe('nestedRecordState', () => {
    const item: Item = { groupId: 'g1', itemId: 'i1', value: 'test', revision: 0 };
    type State = Record<string, Record<string, Item>>;

    describe('create', () => {
        test('should add item at correct nested path', () => {
            const next = handler.create({} as State, item);
            expect(next).toEqual({ g1: { i1: item } });
        });

        test('should preserve existing entries', () => {
            const other: Item = { groupId: 'g1', itemId: 'i2', value: 'other', revision: 0 };
            const state: State = { g1: { i2: other } };
            const next = handler.create(state, item);
            expect(next).toEqual({ g1: { i1: item, i2: other } });
        });

        test('should create intermediate records', () => {
            const next = handler.create({} as State, item);
            expect(next.g1.i1).toEqual(item);
        });
    });

    describe('update', () => {
        const state: State = { g1: { i1: item } };

        test('should update existing item', () => {
            const next = handler.update(state, ['g1', 'i1'], { value: 'updated' });
            expect(next.g1.i1).toEqual({ ...item, value: 'updated' });
        });

        test('should return state in-place if item does not exist', () => {
            const next = handler.update(state, ['g1', 'missing'], { value: 'nope' });
            expect(next).toBe(state);
        });

        test('should return state in-place if group does not exist', () => {
            const next = handler.update(state, ['missing', 'i1'], { value: 'nope' });
            expect(next).toBe(state);
        });
    });

    describe('remove', () => {
        const state: State = { g1: { i1: item } };

        test('should remove existing item', () => {
            const next = handler.remove(state, ['g1', 'i1']);
            expect(next).toEqual({ g1: {} });
        });

        test('should return state in-place if item does not exist', () => {
            const next = handler.remove(state, ['g1', 'missing']);
            expect(next).toBe(state);
        });

        test('should return state in-place if group does not exist', () => {
            const next = handler.remove(state, ['missing', 'i1']);
            expect(next).toBe(state);
        });
    });

    describe('merge', () => {
        test('should allow leaf creation', () => {
            const existing: State = {};
            const incoming: State = { g1: { i1: item } };
            expect(handler.merge(existing, incoming)).toEqual(incoming);
        });

        test('should allow leaf deletion', () => {
            const existing: State = { g1: { i1: item } };
            const incoming: State = {};
            expect(handler.merge(existing, incoming)).toEqual({});
        });

        test('should allow valid leaf update', () => {
            const updated: Item = { ...item, revision: 2, value: 'updated' };
            const existing: State = { g1: { i1: item } };
            const incoming: State = { g1: { i1: updated } };
            expect(handler.merge(existing, incoming)).toEqual(incoming);
        });

        test('should throw SKIP for noop', () => {
            const state: State = { g1: { i1: item } };
            const copy: State = { g1: { i1: item } };
            expect(() => handler.merge(state, copy)).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should throw CONFLICT for outdated leaf', () => {
            const older: Item = { ...item, revision: -1 };
            const existing: State = { g1: { i1: item } };
            const incoming: State = { g1: { i1: older } };
            expect(() => handler.merge(existing, incoming)).toThrow(OptimisticMergeResult.CONFLICT);
        });

        test('should throw CONFLICT for same-revision different-value leaf', () => {
            const conflicting: Item = { ...item, value: 'conflict' };
            const existing: State = { g1: { i1: item } };
            const incoming: State = { g1: { i1: conflicting } };
            expect(() => handler.merge(existing, incoming)).toThrow(OptimisticMergeResult.CONFLICT);
        });

        test('should handle group-level deletion', () => {
            const other: Item = { groupId: 'g2', itemId: 'i1', value: 'other', revision: 0 };
            const existing: State = { g1: { i1: item }, g2: { i1: other } };
            const incoming: State = { g2: { i1: other } };
            const merged = handler.merge(existing, incoming);
            expect(merged).toEqual({ g2: { i1: other } });
        });

        test('should handle group-level creation', () => {
            const other: Item = { groupId: 'g2', itemId: 'i1', value: 'other', revision: 0 };
            const existing: State = { g1: { i1: item } };
            const incoming: State = { g1: { i1: item }, g2: { i1: other } };
            expect(handler.merge(existing, incoming)).toEqual(incoming);
        });

        test('should skip sub-tree noop and continue', () => {
            /** One group unchanged, another with a valid update */
            const updated: Item = { ...item, revision: 2, value: 'updated' };
            const other: Item = { groupId: 'g2', itemId: 'i1', value: 'other', revision: 0 };
            const existing: State = { g1: { i1: item }, g2: { i1: other } };
            const incoming: State = { g1: { i1: updated }, g2: { i1: other } };
            const merged = handler.merge(existing, incoming);
            expect(merged.g1.i1).toEqual(updated);
        });
    });

    describe('wire', () => {
        const state: State = { g1: { i1: item } };
        const bound = bindStateFactory(handler)(state);

        const actions = {
            create: matcher<{ item: Item }>('create'),
            update: matcher<{ path: [string, string]; item: Partial<Item> }>('update'),
            remove: matcher<{ path: [string, string] }>('remove'),
        };

        test('should wire create action', () => {
            const newItem: Item = { groupId: 'g2', itemId: 'i2', value: 'new', revision: 0 };
            const result = handler.wire(bound, { type: 'create', payload: { item: newItem } }, actions);
            expect(result).toEqual({ ...state, g2: { i2: newItem } });
        });

        test('should wire update action with path spread', () => {
            const result = handler.wire(bound, { type: 'update', payload: { path: ['g1', 'i1'], item: { value: 'updated' } } }, actions);
            expect((result as any).g1.i1).toEqual({ ...item, value: 'updated' });
        });

        test('should wire remove action with path spread', () => {
            const result = handler.wire(bound, { type: 'remove', payload: { path: ['g1', 'i1'] } }, actions);
            expect(result).toEqual({ g1: {} });
        });

        test('should return undefined for unmatched actions', () => {
            const result = handler.wire(bound, { type: 'unknown' }, actions);
            expect(result).toBeUndefined();
        });
    });
});
