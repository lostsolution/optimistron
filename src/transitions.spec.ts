import { createTransitions } from '~actions';
import { TransitionDedupeMode, getTransitionMeta, processTransition } from '~transitions';

const TestTransitionID = `${Math.random()}`;

const transition = createTransitions(
    'test::transition',
    TransitionDedupeMode.OVERWRITE,
)((revision: number) => ({ payload: { revision } }));

const transitionWithHistory = createTransitions(
    'test::transition_with_history',
    TransitionDedupeMode.TRAILING,
)((revision: number) => ({
    payload: { revision },
}));

describe('Transitions', () => {
    test('should push staging transition', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const processed = processTransition(stage, []);

        expect(processed.length).toEqual(1);
        expect(processed[0]).toEqual(stage);
    });

    test('should replace staging transition if already in transition list', () => {
        const existing = transition.stage(TestTransitionID, 1);
        const stage = transition.stage(TestTransitionID, 2);
        const processed = processTransition(stage, [existing]);

        expect(processed.length).toEqual(1);
        expect(processed[0]).toEqual(stage);
    });

    test('should flag transition as failed', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const fail = transition.fail(TestTransitionID, new Error());
        const processed = processTransition(fail, [stage]);

        expect(processed.length).toEqual(1);
        expect(getTransitionMeta(processed[0]).failed).toEqual(true);
        expect(processed[0].type).toEqual(stage.type);
        expect(processed[0].payload).toEqual(stage.payload);
    });

    test('should keep trailing transition', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const stageHistory = transitionWithHistory.stage(TestTransitionID, 2);
        const processed = processTransition(stageHistory, [stage]);

        expect(processed.length).toEqual(1);
        expect(getTransitionMeta(processed[0]).trailing).toEqual(stage);
        expect(processed[0].type).toEqual(stageHistory.type);
        expect(processed[0].payload).toEqual(stageHistory.payload);
    });

    test('should maintain trailing transition on replicated action', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const stageHistory = transitionWithHistory.stage(TestTransitionID, 2);
        const processed = processTransition(stageHistory, processTransition(stageHistory, [stage]));

        expect(processed.length).toEqual(1);
        expect(getTransitionMeta(processed[0]).trailing).toEqual(stage);
        expect(processed[0].type).toEqual(stageHistory.type);
        expect(processed[0].payload).toEqual(stageHistory.payload);
    });

    test('should not keep trailing transition if new overwriting transition', () => {
        const stage = transition.stage(TestTransitionID, 1);
        const stageHistory = transitionWithHistory.stage(TestTransitionID, 2);
        const processed = processTransition(stage, processTransition(stageHistory, processTransition(stage, [])));

        expect(processed.length).toEqual(1);
        expect(getTransitionMeta(processed[0]).trailing).toBeUndefined();
        expect(processed[0].type).toEqual(stage.type);
        expect(processed[0].payload).toEqual(stage.payload);
    });
});
