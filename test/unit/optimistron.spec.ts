import { describe, expect, mock, test } from 'bun:test';

import { optimistron } from '~optimistron';
import { create, createItem, indexedState, reducer } from '~test/utils';
import { toCommit } from '~transitions';

describe('optimistron', () => {
    const item = createItem();

    test('should return reducer and selectOptimistic', () => {
        const result = optimistron('test', {}, indexedState, reducer);
        expect(result.reducer).toBeFunction();
        expect(result.selectOptimistic).toBeFunction();
    });

    test('should throw if namespace is empty', () => {
        expect(() => optimistron('', {}, indexedState, reducer)).toThrow();
    });

    test('should support action sanitization', () => {
        const sanitizeAction = mock((action) => action);
        const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, reducer, { sanitizeAction });
        const initial = optimisticReducer(undefined, { type: 'init' });
        const stage = create.stage(item.id, item);

        optimisticReducer(initial, stage);
        expect(sanitizeAction).toHaveBeenCalledWith(stage);
    });

    test('should handle non-transition actions', () => {
        const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, reducer);
        const initial = optimisticReducer(undefined, { type: 'init' });
        const nextState = optimisticReducer(initial, { type: 'any-action' });

        expect(nextState).toStrictEqual(initial);
        expect(nextState === initial).toBe(true);
    });

    test('committing a non-staged action should noop', () => {
        const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, reducer);
        const initial = optimisticReducer(undefined, { type: 'init' });
        const commit = create.commit(item.id);
        const nextState = optimisticReducer(initial, commit);

        expect(nextState).toStrictEqual(initial);
        expect(nextState === initial).toBe(true);
    });

    test('committing should resolve staged transition and apply as if committed', () => {
        const testReducerSpy = mock(reducer);
        const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, testReducerSpy);
        const initial = optimisticReducer(undefined, { type: 'init' });
        const staged = create.stage(item.id, item);
        const commit = create.commit(item.id);
        [staged, commit].reduce(optimisticReducer, initial);

        /* The reducer is expected to be called three times:
         * - Once for the initial 'init' action.
         * - Once when committing the staged action.
         * - Once when sanitizing the transition state to check for conflicts.
         *   (This re-application of the reducer ensures conflict detection.) */
        expect(testReducerSpy.mock.calls[1][1]).toEqual(toCommit(staged));
    });
});
