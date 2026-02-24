import { describe, expect, test } from 'bun:test';

import { bindStateFactory } from '~state/factory';
import { matcher } from '~test/utils';
import { singularState } from '~state/singular';
import { OptimisticMergeResult } from '~transitions';
import type { MaybeNull } from '~/utils/types';

type Profile = { id: string; name: string; revision: number };

const handler = singularState<Profile>({
    compare: (a) => (b) => {
        if (a.revision > b.revision) return 1;
        if (a.revision === b.revision) return 0;
        return -1;
    },
    eq: (a) => (b) => a.id === b.id && a.name === b.name,
});

describe('singularState', () => {
    const item: Profile = { id: '1', name: 'Alice', revision: 0 };

    describe('create', () => {
        test('should set item from null', () => {
            expect(handler.create(null, item)).toEqual(item);
        });

        test('should replace existing item', () => {
            const existing: Profile = { id: '2', name: 'Bob', revision: 1 };
            expect(handler.create(existing, item)).toEqual(item);
        });
    });

    describe('update', () => {
        test('should merge partial into existing state', () => {
            const next = handler.update(item, { name: 'Bob' });
            expect(next).toEqual({ ...item, name: 'Bob' });
        });

        test('should return state in-place if null', () => {
            const state: MaybeNull<Profile> = null;
            const next = handler.update(state, { name: 'Bob' });
            expect(next).toBe(state);
        });
    });

    describe('remove', () => {
        test('should return null if state exists', () => {
            expect(handler.remove(item)).toBeNull();
        });

        test('should return state in-place if already null', () => {
            const state: MaybeNull<Profile> = null;
            expect(handler.remove(state)).toBe(state);
        });
    });

    describe('merge', () => {
        test('should throw SKIP when referentially equal', () => {
            expect(() => handler.merge(item, item)).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should throw SKIP for both null', () => {
            expect(() => handler.merge(null, null)).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should allow creation (null → T)', () => {
            expect(handler.merge(null, item)).toEqual(item);
        });

        test('should allow deletion (T → null)', () => {
            expect(handler.merge(item, null)).toBeNull();
        });

        test('should allow valid update (higher revision)', () => {
            const updated: Profile = { ...item, revision: 2, name: 'Updated' };
            expect(handler.merge(item, updated)).toEqual(updated);
        });

        test('should throw SKIP for equal items', () => {
            const copy = { ...item };
            expect(() => handler.merge(item, copy)).toThrow(OptimisticMergeResult.SKIP);
        });

        test('should throw CONFLICT if compare returns -1', () => {
            const older: Profile = { ...item, revision: -1 };
            expect(() => handler.merge(item, older)).toThrow(OptimisticMergeResult.CONFLICT);
        });

        test('should throw CONFLICT if same revision but different values', () => {
            const different: Profile = { ...item, name: 'Conflict' };
            expect(() => handler.merge(item, different)).toThrow(OptimisticMergeResult.CONFLICT);
        });
    });

    describe('wire', () => {
        const bound = bindStateFactory(handler)(item);

        const actions = {
            create: matcher<Profile>('create'),
            update: matcher<Partial<Profile>>('update'),
            remove: matcher<void>('remove'),
        };

        test('should wire create action', () => {
            const newItem: Profile = { id: '2', name: 'Bob', revision: 0 };
            const result = handler.wire(bound, { type: 'create', payload: newItem }, actions);
            expect(result).toEqual(newItem);
        });

        test('should wire update action', () => {
            const result = handler.wire(bound, { type: 'update', payload: { name: 'Updated' } }, actions);
            expect(result).toEqual({ ...item, name: 'Updated' });
        });

        test('should wire remove action', () => {
            const result = handler.wire(bound, { type: 'remove', payload: {} }, actions);
            expect(result).toBeNull();
        });

        test('should return undefined for unmatched actions', () => {
            const result = handler.wire(bound, { type: 'unknown' }, actions);
            expect(result).toBeUndefined();
        });
    });
});
