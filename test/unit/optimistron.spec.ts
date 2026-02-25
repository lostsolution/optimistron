import { describe, expect, mock, test } from 'bun:test';

import { createTransitions } from '~actions';
import { optimistron } from '~optimistron';
import { create, createItem, indexedState, reducer, type TestItem } from '~test/utils';
import { TransitionMode, getTransitionMeta, toCommit } from '~transitions';

describe('optimistron', () => {
    const item = createItem();

    test('should return reducer and selectors', () => {
        const result = optimistron('test', {}, indexedState, reducer);
        expect(result.reducer).toBeFunction();
        expect(result.selectors).toBeObject();
        expect(result.selectors.selectOptimistic).toBeFunction();
    });

    test('should throw if namespace is empty', () => {
        expect(() => optimistron('', {}, indexedState, reducer)).toThrow();
    });

    test('should support action sanitization', () => {
        const sanitizeAction = mock((action) => action);
        const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, reducer, { sanitizeAction });
        const initial = optimisticReducer(undefined, { type: 'init' });
        const stage = create.stage(item);

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
        const staged = create.stage(item);
        const commit = create.commit(item.id);
        [staged, commit].reduce(optimisticReducer, initial);

        /* The reducer is expected to be called three times:
         * - Once for the initial 'init' action.
         * - Once when committing the staged action.
         * - Once when sanitizing the transition state to check for conflicts.
         *   (This re-application of the reducer ensures conflict detection.) */
        expect(testReducerSpy.mock.calls[1][1]).toEqual(toCommit(staged));
    });

    describe('TransitionMode.DISPOSABLE', () => {
        const disposableCreate = createTransitions(
            'test::add',
            TransitionMode.DISPOSABLE,
        )((item: TestItem) => ({
            payload: item,
            transitionId: item.id,
        }));

        test('should drop transition on FAIL', () => {
            const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, reducer);
            const initial = optimisticReducer(undefined, { type: 'init' });

            const stage = disposableCreate.stage(item);
            const afterStage = optimisticReducer(initial, stage);
            expect(afterStage.transitions.length).toBe(1);

            const fail = disposableCreate.fail(item.id, new Error('test'));
            const afterFail = optimisticReducer(afterStage, fail);

            expect(afterFail.transitions).toEqual([]);
            expect(afterFail.committed).toStrictEqual(initial.committed);
        });
    });

    describe('TransitionMode.DEFAULT', () => {
        test('should keep failed transition for consumer retry', () => {
            const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, reducer);
            const initial = optimisticReducer(undefined, { type: 'init' });

            const stage = create.stage(item);
            const afterStage = optimisticReducer(initial, stage);
            const fail = create.fail(item.id, new Error('test'));
            const afterFail = optimisticReducer(afterStage, fail);

            expect(afterFail.transitions.length).toBe(1);
            expect(getTransitionMeta(afterFail.transitions[0]).failed).toBe(true);
        });
    });

    describe('TransitionMode.REVERTIBLE', () => {
        const revertibleDelete = createTransitions(
            'test::remove',
            TransitionMode.REVERTIBLE,
        )((dto: Pick<TestItem, 'id'>) => ({
            payload: dto,
            transitionId: dto.id,
        }));

        test('should stash transition on FAIL and revert to trailing', () => {
            const { reducer: optimisticReducer } = optimistron('test', {}, indexedState, reducer);
            const initial = optimisticReducer(undefined, { type: 'init' });

            /* Create and commit so the item exists in committed state */
            const createStage = create.stage(item);
            const afterCreate = optimisticReducer(initial, createStage);
            const afterCommit = optimisticReducer(afterCreate, create.commit(item.id));

            /* Stage an edit, then a revertible delete on the same ID */
            const editStage = create.stage({ ...item, value: 'edited', revision: item.revision + 1 });
            const afterEdit = optimisticReducer(afterCommit, editStage);

            const deleteStage = revertibleDelete.stage({ id: item.id });
            const afterDelete = optimisticReducer(afterEdit, deleteStage);
            expect(afterDelete.transitions.length).toBe(1);
            expect(getTransitionMeta(afterDelete.transitions[0]).trailing).toEqual(editStage);

            const fail = revertibleDelete.fail(item.id, new Error('test'));
            const afterFail = optimisticReducer(afterDelete, fail);

            /** Should revert to the trailing edit transition */
            expect(afterFail.transitions.length).toBe(1);
            expect(afterFail.transitions[0]).toEqual(editStage);
        });
    });
});
