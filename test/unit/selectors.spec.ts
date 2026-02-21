import { afterAll, describe, expect, mock, spyOn, test } from 'bun:test';
import { optimistron } from '~optimistron';
import {
    selectConflictingTransition,
    selectFailedTransition,
    selectFailedTransitions,
    selectIsConflicting,
    selectIsFailed,
    selectIsOptimistic,
} from '~selectors';
import { create, createIndexedState, createItem, indexedState, reducer, selectState } from '~test/utils';
import { updateTransition } from '~transitions';

describe('selectors', () => {
    const item = createItem();
    const stage = create.stage(item.id, item);

    describe('selectOptimistic', () => {
        const state = createIndexedState([stage]);
        const warn = spyOn(console, 'warn').mockImplementation(mock());
        afterAll(() => warn.mockRestore());

        test('should fast-path when no transitions', () => {
            const { selectOptimistic } = optimistron('test', {}, indexedState, reducer);
            const emptyState = createIndexedState();
            expect(selectOptimistic(() => 1337)(emptyState)).toEqual(1337);
        });

        test('should apply transitions as if committed and run selector', () => {
            const { selectOptimistic } = optimistron('test', {}, indexedState, reducer);
            expect(selectOptimistic(selectState)(state)).toEqual({ [item.id]: item });
        });

        test('should warn and return committed state on replay error', () => {
            const { selectOptimistic } = optimistron(
                'test',
                {},
                indexedState,
                () => {
                    throw new Error('replay error');
                },
            );

            const errorState = createIndexedState([stage]);

            warn.mockClear();
            expect(selectOptimistic(selectState)(errorState)).toEqual(errorState.state);
            expect(warn).toHaveBeenCalledTimes(1);
        });
    });

    describe('selectFailedTransitions', () => {
        const failed = updateTransition(stage, { failed: true });
        const state = createIndexedState([stage, failed]);

        test('should return transitions flagged as `failed`', () =>
            expect(selectFailedTransitions(state)).toEqual([failed]));
    });

    describe('selectFailedTransition', () => {
        const failed = updateTransition(stage, { failed: true });
        const state = createIndexedState([failed]);

        test('should return transition flagged as `failed` for `transitionId`', () =>
            expect(selectFailedTransition(item.id)(state)).toEqual(failed));

        test('should return empty if no failed transitions matching `transitionId`', () =>
            expect(selectFailedTransition('unknown')(state)).toBeUndefined());
    });

    describe('selectConflictingTransition', () => {
        const conflict = updateTransition(stage, { conflict: true });
        const state = createIndexedState([conflict]);

        test('should return transitions flagged as `conflict` for `transitionId`', () =>
            expect(selectConflictingTransition(item.id)(state)).toEqual(conflict));

        test('should return empty if no conflicting transitions matching `transitionId`', () =>
            expect(selectConflictingTransition('unknown')(state)).toBeUndefined());
    });

    describe('selectIsOptimistic', () => {
        const state = createIndexedState([stage]);

        test('should return `true` if `transitionId` in transition list', () =>
            expect(selectIsOptimistic(item.id)(state)).toEqual(true));

        test('should return `false` if not', () => {
            const committedState = createIndexedState();
            committedState.state = { [item.id]: item };

            expect(selectIsOptimistic(item.id)(createIndexedState())).toEqual(false);
            expect(selectIsOptimistic(item.id)(committedState)).toEqual(false);
        });
    });

    describe('selectIsFailed', () => {
        const failed = updateTransition(stage, { failed: true });
        const state = createIndexedState([stage]);
        const failedState = createIndexedState([failed]);

        test('should return `true` if failed transition for `transitionId` exists', () =>
            expect(selectIsFailed(item.id)(failedState)).toEqual(true));

        test('should return `false` if not', () => {
            expect(selectIsFailed('unknown')(failedState)).toEqual(false);
            expect(selectIsFailed(item.id)(state)).toEqual(false);
        });
    });

    describe('selectIsConflicting', () => {
        const conflict = updateTransition(stage, { conflict: true });
        const state = createIndexedState([stage]);
        const conflictingState = createIndexedState([conflict]);

        test('should return `true` if conflicting transition for `transitionId` exists', () =>
            expect(selectIsConflicting(item.id)(conflictingState)).toEqual(true));

        test('should return `false` if not', () => {
            expect(selectIsConflicting('unknown')(conflictingState)).toEqual(false);
            expect(selectIsConflicting(item.id)(state)).toEqual(false);
        });
    });
});
