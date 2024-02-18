import { describe, expect, mock, test } from 'bun:test';
import { REDUCER_KEY } from '~constants';
import type { StateHandler } from '~state';
import { bindStateFactory, buildTransitionState, isTransitionState, transitionStateFactory } from '~state';
import { create, createIndexedState, createItem } from '~test/utils';

describe('state', () => {
    describe('bindStateFactory', () => {
        describe('should bind', () => {
            const create = mock();
            const update = mock();
            const remove = mock();
            const merge = mock();

            const handler: StateHandler<any, any, any, any> = { create, update, remove, merge };
            const bindState = bindStateFactory(handler);

            const state = Symbol('state');
            const nextState = Symbol('next_state');
            const boundState = bindState(state);

            const mockParams = Array.from({ length: 5 }, () => Math.random());

            test('create', () => {
                boundState.create(...mockParams);
                expect(create).toHaveBeenCalledWith(state, ...mockParams);
            });

            test('update', () => {
                boundState.update(...mockParams);
                expect(update).toHaveBeenCalledWith(state, ...mockParams);
            });

            test('remove', () => {
                boundState.remove(...mockParams);
                expect(remove).toHaveBeenCalledWith(state, ...mockParams);
            });

            test('merge', () => {
                boundState.merge(nextState);
                expect(merge).toHaveBeenCalledWith(state, nextState);
            });

            test('getState', () => expect(boundState.getState()).toEqual(state));
        });
    });

    describe('isTransitionState', () => {
        test('should return `true` if `ReducerIdKey` in parameter', () => {
            expect(isTransitionState({ [REDUCER_KEY]: 'test' })).toBe(true);
        });

        test('should return `false` otherwise', () => {
            expect(isTransitionState({})).toBe(false);
        });
    });

    describe('buildTransitionState', () => {
        test('should return state clone if already is a transition state', () => {
            const state = createIndexedState();
            const result = buildTransitionState(state, [], 'test');

            expect(isTransitionState(result)).toBe(true);
            expect(state).toMatchObject(result);
        });

        test('should build transition state otherwise', () => {
            const result = buildTransitionState({}, [], 'test');

            expect(isTransitionState(result)).toBe(true);
            expect(result).toMatchObject(createIndexedState());
        });
    });

    describe('transitionStateFactory', () => {
        test('should return reference if nothing changed', () => {
            const state = createIndexedState();
            const next = transitionStateFactory(state)(state.state, state.transitions);

            expect(state === next).toBe(true);
        });

        test('should return updated copy if state changed', () => {
            const item = createItem();
            const state = createIndexedState();
            const next = transitionStateFactory(state)({ [item.id]: item }, state.transitions);

            expect(state !== next).toBe(true);
            expect(next.state).toEqual({ [item.id]: item });
        });

        test('should return updated copy if transitions changed', () => {
            const item = createItem();
            const state = createIndexedState();
            const next = transitionStateFactory(state)({}, [create.stage(item.id, item)]);

            expect(state !== next).toBe(true);
            expect(next.transitions).toEqual([create.stage(item.id, item)]);
        });
    });
});
