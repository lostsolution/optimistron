import { afterAll, afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { createTransitions } from '~actions';
import { bindReducer } from '~reducer';
import { bindStateFactory } from '~state/factory';
import { create, createIndexedState, createItem, edit, indexedState, reducer } from '~test/utils';
import type { StagedAction, TransitionAction } from '~transitions';
import {
    TransitionMode,
    OptimisticMergeResult,
    getTransitionMeta,
    processTransition,
    retryTransition,
    sanitizeTransitions,
    toCommit,
    updateTransition,
} from '~transitions';

const TestTransitionID = `${Math.random()}`;

const transition = createTransitions('test::transition', TransitionMode.DEFAULT)((revision: number) => ({ payload: { revision } }));

const transitionTrailing = createTransitions(
    'test::transition_with_history',
    TransitionMode.REVERTIBLE,
)((revision: number) => ({
    payload: { revision },
}));

const applyTransitions = (...tansitions: TransitionAction[]) => tansitions.reduce<StagedAction[]>((next, curr) => processTransition(curr, next), []);

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
        test('should flag DEFAULT transition as failed', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const fail = transition.fail(TestTransitionID, new Error());
            const processed = applyTransitions(stage, fail);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).failed).toEqual(true);
            expect(processed[0].type).toEqual(stage.type);
            expect('payload' in processed[0] && processed[0].payload).toEqual(stage.payload);
        });

        test('should drop DISPOSABLE transition on fail', () => {
            const disposable = createTransitions('test::disposable', TransitionMode.DISPOSABLE)((revision: number) => ({ payload: { revision } }));
            const stage = disposable.stage(TestTransitionID, 1);
            const fail = disposable.fail(TestTransitionID, new Error());
            const processed = applyTransitions(stage, fail);

            expect(processed).toEqual([]);
        });

        test('should stash REVERTIBLE transition on fail', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stageRevertible = transitionTrailing.stage(TestTransitionID, 2);
            const fail = transitionTrailing.fail(TestTransitionID, new Error());
            const processed = applyTransitions(stage, stageRevertible, fail);

            /** Should revert to the trailing transition */
            expect(processed).toEqual([stage]);
        });

        test('should remove REVERTIBLE transition on fail when no trailing', () => {
            const stageRevertible = transitionTrailing.stage(TestTransitionID, 1);
            const fail = transitionTrailing.fail(TestTransitionID, new Error());
            const processed = applyTransitions(stageRevertible, fail);

            expect(processed).toEqual([]);
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

describe('retryTransition', () => {
    test('should strip failed and conflict flags', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const failed = updateTransition(stage, { failed: true, conflict: true });
        const retried = retryTransition(failed);

        expect(getTransitionMeta(retried).failed).toBeUndefined();
        expect(getTransitionMeta(retried).conflict).toBeUndefined();
        expect(getTransitionMeta(retried).id).toBe(TestTransitionID);
        expect(retried.payload).toEqual(stage.payload);
    });

    test('should preserve other meta fields', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const withRetry = updateTransition(stage, { failed: true, retryCount: 3, lastRetry: 12345 });
        const retried = retryTransition(withRetry);

        expect(getTransitionMeta(retried).retryCount).toBe(3);
        expect(getTransitionMeta(retried).lastRetry).toBe(12345);
    });
});

describe('processTransition retry metadata', () => {
    test('should increment retryCount when overwriting a failed transition', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const fail = transition.fail(TestTransitionID, new Error());
        const restage = transition.stage(TestTransitionID, 2);

        const afterFail = applyTransitions(stage, fail);
        const afterRestage = processTransition(restage, afterFail);

        expect(getTransitionMeta(afterRestage[0]).retryCount).toBe(1);
        expect(getTransitionMeta(afterRestage[0]).lastRetry).toBeNumber();
    });

    test('should accumulate retryCount across multiple retries', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const fail1 = transition.fail(TestTransitionID, new Error());
        const restage1 = transition.stage(TestTransitionID, 2);
        const fail2 = transition.fail(TestTransitionID, new Error());
        const restage2 = transition.stage(TestTransitionID, 3);

        const result = applyTransitions(stage, fail1, restage1, fail2, restage2);
        expect(getTransitionMeta(result[0]).retryCount).toBe(2);
    });

    test('should not add retryCount when overwriting a non-failed transition', () => {
        const stage1 = transition.stage(TestTransitionID, 1);
        const stage2 = transition.stage(TestTransitionID, 2);

        const result = applyTransitions(stage1, stage2);
        expect(getTransitionMeta(result[0]).retryCount).toBeUndefined();
    });
});

describe('sanitizeTransition', () => {
    const item = createItem();

    const stage = create.stage(item);
    const commit = toCommit(stage);
    const noop = edit.stage(item); /* noops because no matching item to update */
    const conflict = edit.stage({ ...item, revision: item.revision - 1 });

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
