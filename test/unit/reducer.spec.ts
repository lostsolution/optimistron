import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { bindReducer, resolveReducer } from '~reducer';
import { bindStateFactory } from '~state/factory';
import type { StateHandler, TransitionState } from '~state/types';
import type { TestIndexedState, TestItem } from '~test/utils';
import { createItem, indexedState, matcher, reducer, throwAction } from '~test/utils';

describe('bindReducer', () => {
    const item = createItem();
    const bindState = bindStateFactory(indexedState);
    const innerReducer = mock(reducer);
    const boundReducer = bindReducer(innerReducer, bindState);
    const action = { type: 'any-action' };

    const transitionState: TransitionState<TestIndexedState> = {
        transitions: [],
        state: { [item.id]: item },
    };

    beforeEach(() => innerReducer.mockClear());

    test('should return a bound reducer over the provided state handler', () => {
        boundReducer(transitionState, action);

        expect(innerReducer).toHaveBeenCalledTimes(1);
        expect(innerReducer.mock.calls[0][0]).toMatchObject(bindState(transitionState.state));
        expect(innerReducer.mock.calls[0][1]).toEqual(action);
    });

    describe('bound reducer', () => {
        test('should return the unwrapped next transition state', () => {
            expect(boundReducer(transitionState, action)).toEqual(transitionState.state);
        });

        test('should propagate reducer errors', () => {
            expect(() => boundReducer(transitionState, throwAction)).toThrow('test error');
        });
    });
});

describe('resolveReducer', () => {
    const item = createItem();
    const bindState = bindStateFactory(indexedState);
    const state = { [item.id]: item };

    test('should pass through function config (manual mode)', () => {
        const resolved = resolveReducer(indexedState, reducer);
        expect(resolved).toBe(reducer);
    });

    test('should throw if handler has no wire method', () => {
        const noWire: StateHandler<any, any, any, any> = {
            create: () => ({}),
            update: () => ({}),
            remove: () => ({}),
            merge: () => ({}),
        };
        expect(() => resolveReducer(noWire, { create: matcher('create') } as any)).toThrow('missing wire method');
    });

    test('should auto-wire CRUD actions via handler.wire', () => {
        const resolved = resolveReducer(indexedState, { create: matcher<{ item: TestItem }>('create') });
        const newItem = createItem({ id: 'new' });
        const bound = bindState(state);
        const result = resolved(bound, { type: 'create', payload: { item: newItem } } as any);
        expect(result).toEqual({ ...state, new: newItem });
    });

    test('should fall through to fallback reducer for unmatched actions', () => {
        const fallback = mock((_bound: any, _action: any) => ({ fallback: true }));
        const resolved = resolveReducer(indexedState, {
            create: matcher<{ item: TestItem }>('__nomatch__'),
            reducer: fallback as any,
        });
        const bound = bindState(state);
        resolved(bound, { type: 'unknown' } as any);
        expect(fallback).toHaveBeenCalledTimes(1);
    });

    test('should return getState() when no match and no fallback', () => {
        const resolved = resolveReducer(indexedState, {
            create: matcher<{ item: TestItem }>('__nomatch__'),
        });
        const bound = bindState(state);
        const result = resolved(bound, { type: 'unknown' } as any);
        expect(result).toEqual(state);
    });
});
