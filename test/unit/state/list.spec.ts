import { describe, expect, test } from 'bun:test';

import { bindStateFactory } from '~state/factory';
import { matcher } from '~test/utils';
import { listState } from '~state/list';
import { OptimisticMergeResult } from '~transitions';

type Item = { id: string; name: string; revision: number };

const handler = listState<Item>({
    key: 'id',
    compare: (a, b) => {
        if (a.revision > b.revision) return 1;
        if (a.revision === b.revision) return 0;
        return -1;
    },
    eq: (a, b) => a.id === b.id && a.name === b.name,
});

describe('listState', () => {
    const item: Item = { id: '1', name: 'Alice', revision: 0 };
    const empty: Item[] = [];

    describe('create', () => {
        test('should append item to empty list', () => {
            const result = handler.create(empty, item);
            expect(result).toEqual([item]);
        });

        test('should append item to end of list', () => {
            const existing: Item = { id: '2', name: 'Bob', revision: 0 };
            const state = [existing];
            const result = handler.create(state, item);
            expect(result).toEqual([existing, item]);
        });

        test('should return same reference if item with same key exists', () => {
            const state = [item];
            const result = handler.create(state, { ...item, name: 'Different' });
            expect(result).toBe(state);
        });
    });

    describe('update', () => {
        test('should merge partial into matching item', () => {
            const state = [item];
            const result = handler.update(state, { id: '1', name: 'Updated' });
            expect(result).toEqual([{ ...item, name: 'Updated' }]);
        });

        test('should return same reference if item not found', () => {
            const state = [item];
            const result = handler.update(state, { id: 'nonexistent', name: 'Updated' });
            expect(result).toBe(state);
        });

        test('should preserve order when updating', () => {
            const a: Item = { id: '1', name: 'A', revision: 0 };
            const b: Item = { id: '2', name: 'B', revision: 0 };
            const c: Item = { id: '3', name: 'C', revision: 0 };
            const state = [a, b, c];
            const result = handler.update(state, { id: '2', name: 'Updated' });
            expect(result).toEqual([a, { ...b, name: 'Updated' }, c]);
        });
    });

    describe('remove', () => {
        test('should remove item by key', () => {
            const state = [item];
            const result = handler.remove(state, { id: '1' });
            expect(result).toEqual([]);
        });

        test('should return same reference if item not found', () => {
            const state = [item];
            const result = handler.remove(state, { id: 'nonexistent' });
            expect(result).toBe(state);
        });

        test('should preserve order of remaining items', () => {
            const a: Item = { id: '1', name: 'A', revision: 0 };
            const b: Item = { id: '2', name: 'B', revision: 0 };
            const c: Item = { id: '3', name: 'C', revision: 0 };
            const state = [a, b, c];
            const result = handler.remove(state, { id: '2' });
            expect(result).toEqual([a, c]);
        });
    });

    describe('merge', () => {
        test('should throw SKIP when referentially equal', () => {
            const state = [item];
            expect(() => handler.merge(state, state)).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should throw SKIP for both empty', () => {
            expect(() => handler.merge([], [])).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should throw SKIP when items are equal', () => {
            const state = [item];
            const copy = [{ ...item }];
            expect(() => handler.merge(state, copy)).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should detect addition (new item in incoming)', () => {
            const newItem: Item = { id: '2', name: 'Bob', revision: 0 };
            const incoming = [item, newItem];
            expect(handler.merge([item], incoming)).toBe(incoming);
        });

        test('should detect deletion (item missing in incoming)', () => {
            const a: Item = { id: '1', name: 'A', revision: 0 };
            const b: Item = { id: '2', name: 'B', revision: 0 };
            const incoming = [a];
            expect(handler.merge([a, b], incoming)).toBe(incoming);
        });

        test('should detect valid update (higher revision)', () => {
            const updated: Item = { ...item, revision: 2, name: 'Updated' };
            const incoming = [updated];
            expect(handler.merge([item], incoming)).toBe(incoming);
        });

        test('should throw CONFLICT for version regression', () => {
            const older: Item = { ...item, revision: -1 };
            expect(() => handler.merge([item], [older])).toThrow(OptimisticMergeResult.CONFLICT);
        });

        test('should throw CONFLICT for same revision but different values', () => {
            const different: Item = { ...item, name: 'Conflict' };
            expect(() => handler.merge([item], [different])).toThrow(OptimisticMergeResult.CONFLICT);
        });

        test('should allow empty to non-empty', () => {
            const incoming = [item];
            expect(handler.merge([], incoming)).toBe(incoming);
        });

        test('should allow non-empty to empty', () => {
            const incoming: Item[] = [];
            expect(handler.merge([item], incoming)).toBe(incoming);
        });
    });

    describe('wire', () => {
        const state = [item];
        const bound = bindStateFactory(handler)(state);

        const actions = {
            create: matcher<Item>('create'),
            update: matcher<Partial<Item>>('update'),
            remove: matcher<Partial<Item>>('remove'),
        };

        test('should wire create action', () => {
            const newItem: Item = { id: '2', name: 'Bob', revision: 0 };
            const result = handler.wire(bound, { type: 'create', payload: newItem }, actions);
            expect(result).toEqual([item, newItem]);
        });

        test('should wire update action', () => {
            const result = handler.wire(bound, { type: 'update', payload: { id: '1', name: 'Updated' } }, actions);
            expect(result).toEqual([{ ...item, name: 'Updated' }]);
        });

        test('should wire remove action', () => {
            const result = handler.wire(bound, { type: 'remove', payload: { id: '1' } }, actions);
            expect(result).toEqual([]);
        });

        test('should return undefined for unmatched actions', () => {
            const result = handler.wire(bound, { type: 'unknown' }, actions);
            expect(result).toBeUndefined();
        });
    });
});
