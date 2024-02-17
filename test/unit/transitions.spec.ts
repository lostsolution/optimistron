import { afterAll, afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { createTransitions } from '~actions';
import { bindReducer } from '~reducer';
import { bindStateFactory } from '~state';
import { create, createIndexedState, createItem, edit, indexedState, reducer } from '~test/utils';
import type { StagedAction, TransitionAction } from '~transitions';
import {
    DedupeMode,
    OptimisticMergeResult,
    getTransitionMeta,
    processTransition,
    sanitizeTransitions,
    toCommit,
    updateTransition,
} from '~transitions';

const TestTransitionID = `${Math.random()}`;

const transition = createTransitions(
    'test::transition',
    DedupeMode.OVERWRITE,
)((revision: number) => ({ payload: { revision } }));

const transitionTrailing = createTransitions(
    'test::transition_with_history',
    DedupeMode.TRAILING,
)((revision: number) => ({
    payload: { revision },
}));

const applyTransitions = (...tansitions: TransitionAction[]) =>
    tansitions.reduce<StagedAction[]>((next, curr) => processTransition(curr, next), []);

describe('processTransition', () => {
    describe('stage', () => {
        test('should push staging transition', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const processed = processTransition(stage, []);

            expect(processed.length).toEqual(1);
            expect(processed[0]).toEqual(stage);
        });

        test('should replace staging transition if already in transition list', () => {
            const existing = transition.stage(TestTransitionID, 1);
            const stage = transition.stage(TestTransitionID, 2);
            const processed = applyTransitions(existing, stage);

            expect(processed.length).toEqual(1);
            expect(processed[0]).toEqual(stage);
        });

        test('should keep trailing transition', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stageTrailing = transitionTrailing.stage(TestTransitionID, 2);
            const processed = applyTransitions(stage, stageTrailing);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).trailing).toEqual(stage);
            expect(processed[0].type).toEqual(stageTrailing.type);
            expect('payload' in processed[0] && processed[0].payload).toEqual(stageTrailing.payload);
        });

        test('should maintain trailing transition on replicated action', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stageTrailing = transitionTrailing.stage(TestTransitionID, 2);
            const processed = applyTransitions(stage, stageTrailing, stageTrailing);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).trailing).toEqual(stage);
            expect(processed[0].type).toEqual(stageTrailing.type);
            expect('payload' in processed[0] && processed[0].payload).toEqual(stageTrailing.payload);
        });

        test('should not keep trailing transition if new overwriting transition', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stageTrailing = transitionTrailing.stage(TestTransitionID, 2);
            const processed = applyTransitions(stage, stageTrailing, stage);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).trailing).toBeUndefined();
            expect(processed[0].type).toEqual(stage.type);
            expect('payload' in processed[0] && processed[0].payload).toEqual(stage.payload);
        });
    });

    describe('fail', () => {
        test('should flag transition as failed', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const fail = transition.fail(TestTransitionID, new Error());
            const processed = applyTransitions(stage, fail);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).failed).toEqual(true);
            expect(processed[0].type).toEqual(stage.type);
            expect('payload' in processed[0] && processed[0].payload).toEqual(stage.payload);
        });

        test('should noop if no matching transition to fail', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const fail = transition.fail(`${Math.random()}`, new Error());
            const processed = applyTransitions(stage, fail);

            expect(processed).toEqual([stage]);
        });
    });

    describe('stash', () => {
        test('should remove staged transition matching transitionId', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stash = transition.stash(TestTransitionID);
            const processed = applyTransitions(stage, stash);

            expect(processed).toEqual([]);
        });

        test('should noop if no matching transition to stash', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stash = transition.stash(`${Math.random()}`);
            const processed = applyTransitions(stage, stash);

            expect(processed).toEqual([stage]);
        });

        test('should revert to trailing transition on stash if trailing', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stageTrailing = transitionTrailing.stage(TestTransitionID, 2);
            const stashTrailing = transitionTrailing.stash(TestTransitionID);
            const processed = applyTransitions(stage, stageTrailing, stashTrailing);

            expect(processed).toEqual([stage]);
        });
    });

    describe('commit', () => {
        test('should remove transition matching transitionId from transition list', () => {
            const stageA = transition.stage(TestTransitionID, 1);
            const stageB = transition.stage(`${Math.random()}`, 1);
            const commitA = transition.commit(TestTransitionID);
            const processed = applyTransitions(stageA, stageB, commitA);

            expect(processed).toEqual([stageB]);
        });
    });
});

describe('sanitizeTransition', () => {
    const item = createItem();

    const stage = create.stage(item.id, item);
    const commit = toCommit(stage);
    const noop = edit.stage(item.id, item); /* noops because no matching item to update */
    const conflict = edit.stage(item.id, { ...item, revision: item.revision - 1 });

    const innerReducer = mock(reducer);
    const bindState = bindStateFactory(indexedState);
    const boundReducer = bindReducer(innerReducer, bindState);

    let mergeError: unknown;

    const baseMerge = indexedState.merge;

    const mergeSpy = spyOn(indexedState, 'merge').mockImplementation((...args) => {
        try {
            return baseMerge(...args);
        } catch (err) {
            mergeError = err;
            throw err;
        }
    });

    afterEach(() => {
        innerReducer.mockClear();
        mergeSpy.mockClear();
        mergeError = undefined;
    });

    afterAll(() => mergeSpy.mockRestore());

    test('should apply transitions as if they were committed', () => {
        const result = sanitizeTransitions(boundReducer, bindState)(createIndexedState([stage]));

        expect(result).toEqual([stage]);
        expect(innerReducer).toHaveBeenCalledTimes(1);
        expect(innerReducer.mock.calls[0][1]).toEqual(commit);
    });

    test('should keep transition if it mutates state', () => {
        const result = sanitizeTransitions(boundReducer, bindState)(createIndexedState([stage]));
        expect(result).toEqual([stage]);
    });

    test('should discard transitions that do not mutate state', () => {
        const result = sanitizeTransitions(boundReducer, bindState)(createIndexedState([noop]));
        expect(result).toEqual([]);
    });

    test('should discard transitions which trigger a `SKIP` error', () => {
        const result = sanitizeTransitions(boundReducer, bindState)(createIndexedState([noop]));

        expect(mergeError).toEqual(OptimisticMergeResult.SKIP);
        expect(result).toEqual([]);
    });

    test('should keep transitions which trigger a `CONFLICT` error', () => {
        const initial = createIndexedState([conflict]);
        initial.state[item.id] = item;
        const result = sanitizeTransitions(boundReducer, bindState)(initial);

        expect(mergeError).toEqual(OptimisticMergeResult.CONFLICT);
        expect(result).toEqual([updateTransition(conflict, { conflict: true })]);
    });
});
