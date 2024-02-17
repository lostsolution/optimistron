import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ReducerIdKey } from '~constants';
import { optimistron } from '~optimistron';
import { ReducerMap } from '~reducer';
import {
    selectConflictingTransition,
    selectFailedTransition,
    selectFailedTransitions,
    selectIsConflicting,
    selectIsFailed,
    selectIsOptimistic,
    selectOptimistic,
} from '~selectors';
import { create, createIndexedState, createItem, indexedState, reducer, selectState } from '~test/utils';
import { updateTransition } from '~transitions';

describe('selectors', () => {
    beforeEach(() => optimistron('test', {}, indexedState, reducer));
    afterEach(() => ReducerMap.clear());

    const item = createItem();
    const stage = create.stage(item.id, item);

    describe('selectOptimistic', () => {
        const state = createIndexedState([stage]);

        test('should apply default selector if no registered reducer', () => {
            expect(
                selectOptimistic(() => 1337)({
                    transitions: [],
                    [ReducerIdKey]: 'unknown',
                    state: 42,
                }),
            ).toEqual(1337);
        });

        test('should apply transitions as if committed and run selector', () =>
            expect(selectOptimistic(selectState)(state)).toEqual({ [item.id]: item }));
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
