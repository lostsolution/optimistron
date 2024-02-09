import { createTransitions } from '~actions';
import type { TransitionAction } from '~transitions';
import { TransitionDedupeMode, getTransitionMeta, processTransition } from '~transitions';

const TestTransitionID = `${Math.random()}`;

const transition = createTransitions(
    'test::transition',
    TransitionDedupeMode.OVERWRITE,
)((revision: number) => ({ payload: { revision } }));

const transitionTrailing = createTransitions(
    'test::transition_with_history',
    TransitionDedupeMode.TRAILING,
)((revision: number) => ({
    payload: { revision },
}));

const applyTransitions = (...tansitions: TransitionAction[]) =>
    tansitions.reduce<TransitionAction[]>((next, curr) => processTransition(curr, next), []);

describe('Transitions', () => {
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
            expect(processed[0].payload).toEqual(stageTrailing.payload);
        });

        test('should maintain trailing transition on replicated action', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stageTrailing = transitionTrailing.stage(TestTransitionID, 2);

            const processed = applyTransitions(stage, stageTrailing, stageTrailing);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).trailing).toEqual(stage);
            expect(processed[0].type).toEqual(stageTrailing.type);
            expect(processed[0].payload).toEqual(stageTrailing.payload);
        });

        test('should not keep trailing transition if new overwriting transition', () => {
            const stage = transition.stage(TestTransitionID, 1);
            const stageTrailing = transitionTrailing.stage(TestTransitionID, 2);

            const processed = applyTransitions(stage, stageTrailing, stage);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).trailing).toBeUndefined();
            expect(processed[0].type).toEqual(stage.type);
            expect(processed[0].payload).toEqual(stage.payload);
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
            expect(processed[0].payload).toEqual(stage.payload);
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
