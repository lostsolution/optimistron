import { describe, expect, mock, test } from 'bun:test';
import { bindStateFactory, buildTransitionState, transitionStateFactory } from '~state';
import type { StateHandler } from '~state.types';
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

    describe('buildTransitionState', () => {
        test('should build transition state with non-enumerable transitions', () => {
            const result = buildTransitionState({}, []);

            expect(result.state).toEqual({});
            expect(result.transitions).toEqual([]);
            expect(Object.keys(result)).not.toContain('transitions');
        });

        test('should match createIndexedState structure', () => {
            const result = buildTransitionState({}, []);
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
