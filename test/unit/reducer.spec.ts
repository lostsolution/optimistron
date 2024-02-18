import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { REDUCER_KEY } from '~constants';
import { bindReducer } from '~reducer';
import type { TransitionState } from '~state';
import { bindStateFactory } from '~state';
import type { TestIndexedState } from '~test/utils';
import { createItem, indexedState, reducer, throwAction } from '~test/utils';

describe('bindReducer', () => {
    const item = createItem();
    const bindState = bindStateFactory(indexedState);
    const innerReducer = mock(reducer);
    const boundReducer = bindReducer(innerReducer, bindState);
    const action = { type: 'any-action' };

    const transitionState: TransitionState<TestIndexedState> = {
        transitions: [],
        state: { [item.id]: item },
        [REDUCER_KEY]: 'test-reducer',
    };

    const warn = spyOn(console, 'warn').mockImplementation(mock());

    beforeEach(() => innerReducer.mockClear());
    afterAll(() => warn.mockReset());

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

        test('should return the unwrapped transition state on error', () => {
            expect(boundReducer(transitionState, throwAction)).toEqual(transitionState.state);
        });
    });
});
