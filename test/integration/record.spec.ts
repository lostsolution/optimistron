import { describe, expect, mock, spyOn, test } from 'bun:test';

import { optimistron } from '~optimistron';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic } from '~selectors/selectors';
import { buildTransitionState } from '~state/factory';
import type { TestIndexedState } from '~test/utils';
import { create, createItem, edit, indexedState, reducer, remove, selectState, sync, throwAction } from '~test/utils';
import { getTransitionMeta, toStaged, updateTransition } from '~transitions';

describe('optimistron', () => {
    const { reducer: optimisticReducer, selectOptimistic } = optimistron('test', {}, indexedState, reducer);

    describe('recordState', () => {
        describe('create', () => {
            const item = createItem();
            const conflictItem = { ...item, revision: -1 };
            const amendedItem = { ...item, value: 'amended value' };

            const stage = create.stage(item);
            const amend = create.amend(item.id, amendedItem);
            const fail = create.fail(item.id, new Error());
            const stash = create.stash(item.id);
            const commit = create.commit(item.id);
            const conflict = create.stage(conflictItem);

            const initial = buildTransitionState(<TestIndexedState>{}, []);
            const state = optimisticReducer(initial, stage);

            describe('stage', () => {
                test('should stage transition without modifying state', () => {
                    expect(state.state).toStrictEqual(initial.state);
                    expect(state.transitions).toStrictEqual([stage]);
                    expect(selectOptimistic(selectState)(state)).toEqual({ [item.id]: item });
                    expect(selectIsOptimistic(item.id)(state)).toBe(true);
                    expect(selectIsFailed(item.id)(state)).toBe(false);
                    expect(selectIsConflicting(item.id)(state)).toBe(false);
                });

                test('amend', () => {
                    const next = optimisticReducer(state, amend);

                    expect(next.state).toStrictEqual(initial.state);
                    expect(next.transitions).toStrictEqual([toStaged(amend)]);
                    expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: amendedItem });
                    expect(selectIsOptimistic(item.id)(next)).toBe(true);
                    expect(selectIsFailed(item.id)(next)).toBe(false);
                    expect(selectIsConflicting(item.id)(next)).toBe(false);
                });

                test('commit', () => {
                    const next = optimisticReducer(state, commit);

                    expect(next.state).toStrictEqual({ [item.id]: item });
                    expect(next.transitions).toStrictEqual([]);
                    expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: item });
                    expect(selectIsOptimistic(item.id)(next)).toBe(false);
                    expect(selectIsFailed(item.id)(next)).toBe(false);
                    expect(selectIsConflicting(item.id)(next)).toBe(false);
                });

                test('stash', () => {
                    const next = optimisticReducer(state, stash);

                    expect(next.state).toStrictEqual({});
                    expect(next.transitions).toStrictEqual([]);
                    expect(selectOptimistic(selectState)(next)).toEqual({});
                    expect(selectIsOptimistic(item.id)(next)).toBe(false);
                    expect(selectIsFailed(item.id)(next)).toBe(false);
                    expect(selectIsConflicting(item.id)(next)).toBe(false);
                });

                test('conflict', () => {
                    const next = [commit, conflict].reduce((prev, action) => optimisticReducer(prev, action), state);

                    expect(next.state).toStrictEqual({ [item.id]: item });
                    expect(next.transitions).toStrictEqual([updateTransition(conflict, { conflict: true })]);
                    expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: conflictItem });
                    expect(selectIsOptimistic(item.id)(next)).toBe(true);
                    expect(selectIsFailed(item.id)(next)).toBe(false);
                    expect(selectIsConflicting(item.id)(next)).toBe(true);
                });

                describe('fail', () => {
                    const next = optimisticReducer(state, fail);

                    test('should flag transition as failed', () => {
                        expect(next.state).toStrictEqual(initial.state);
                        expect(next.transitions).toStrictEqual([updateTransition(stage, { failed: true })]);
                        expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: item });
                        expect(selectIsOptimistic(item.id)(next)).toBe(true);
                        expect(selectIsFailed(item.id)(next)).toBe(true);
                        expect(selectIsConflicting(item.id)(next)).toBe(false);
                    });

                    test('re-stage', () => {
                        const nextAfterRestage = optimisticReducer(next, stage);

                        expect(nextAfterRestage.state).toStrictEqual(initial.state);
                        expect(nextAfterRestage.transitions.length).toBe(1);
                        expect(getTransitionMeta(nextAfterRestage.transitions[0]).retryCount).toBe(1);
                        expect(getTransitionMeta(nextAfterRestage.transitions[0]).lastRetry).toBeNumber();
                        expect(selectOptimistic(selectState)(nextAfterRestage)).toStrictEqual({ [item.id]: item });
                        expect(selectIsOptimistic(item.id)(nextAfterRestage)).toBe(true);
                        expect(selectIsFailed(item.id)(nextAfterRestage)).toBe(false);
                        expect(selectIsConflicting(item.id)(nextAfterRestage)).toBe(false);
                    });

                    test('amend', () => {
                        const nextAfterAmend = optimisticReducer(next, amend);

                        expect(nextAfterAmend.state).toStrictEqual(initial.state);
                        expect(nextAfterAmend.transitions.length).toBe(1);
                        expect(getTransitionMeta(nextAfterAmend.transitions[0]).failed).toBe(true);
                        expect(getTransitionMeta(nextAfterAmend.transitions[0]).retryCount).toBe(1);
                        expect(getTransitionMeta(nextAfterAmend.transitions[0]).lastRetry).toBeNumber();
                        expect(selectOptimistic(selectState)(nextAfterAmend)).toStrictEqual({ [item.id]: amendedItem });
                        expect(selectIsOptimistic(item.id)(nextAfterAmend)).toBe(true);
                        expect(selectIsFailed(item.id)(nextAfterAmend)).toBe(true);
                        expect(selectIsConflicting(item.id)(nextAfterAmend)).toBe(false);
                    });

                    test('stash', () => {
                        const nextAfterStash = optimisticReducer(next, stash);

                        expect(nextAfterStash.state).toStrictEqual({});
                        expect(nextAfterStash.transitions).toStrictEqual([]);
                        expect(selectOptimistic(selectState)(nextAfterStash)).toEqual({});
                        expect(selectIsOptimistic(item.id)(nextAfterStash)).toBe(false);
                        expect(selectIsFailed(item.id)(nextAfterStash)).toBe(false);
                        expect(selectIsConflicting(item.id)(nextAfterStash)).toBe(false);
                    });

                    test('commit', () => {
                        const nextAfterCommit = optimisticReducer(state, commit);

                        expect(nextAfterCommit.state).toStrictEqual({ [item.id]: item });
                        expect(nextAfterCommit.transitions).toStrictEqual([]);
                        expect(selectOptimistic(selectState)(nextAfterCommit)).toEqual({ [item.id]: item });
                        expect(selectIsOptimistic(item.id)(nextAfterCommit)).toBe(false);
                        expect(selectIsFailed(item.id)(nextAfterCommit)).toBe(false);
                        expect(selectIsConflicting(item.id)(nextAfterCommit)).toBe(false);
                    });
                });
            });
        });
    });

    test('should warn and return unchanged state on reducer error', () => {
        const warn = spyOn(console, 'warn').mockImplementation(mock());
        const initial = buildTransitionState(<TestIndexedState>{}, []);
        const state = optimisticReducer(initial, throwAction);

        expect(state.state).toStrictEqual(initial.state);
        expect(state.transitions).toStrictEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    describe('delete', () => {
        const item = createItem();

        const stage = remove.stage({ id: item.id });
        const fail = remove.fail(item.id, new Error());
        const stash = remove.stash(item.id);
        const commit = remove.commit(item.id);

        const initial = buildTransitionState(<TestIndexedState>{ [item.id]: item }, []);
        const state = optimisticReducer(initial, stage);

        describe('stage', () => {
            test('should stage transition without modifying state', () => {
                expect(state.state).toStrictEqual(initial.state);
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual({});
                expect(selectIsOptimistic(item.id)(state)).toBe(true);
                expect(selectIsFailed(item.id)(state)).toBe(false);
                expect(selectIsConflicting(item.id)(state)).toBe(false);
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);

                expect(next.state).toStrictEqual({});
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toEqual({});
                expect(selectIsOptimistic(item.id)(next)).toBe(false);
                expect(selectIsFailed(item.id)(next)).toBe(false);
                expect(selectIsConflicting(item.id)(next)).toBe(false);
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);

                expect(next.state).toStrictEqual({ [item.id]: item });
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: item });
                expect(selectIsOptimistic(item.id)(next)).toBe(false);
                expect(selectIsFailed(item.id)(next)).toBe(false);
                expect(selectIsConflicting(item.id)(next)).toBe(false);
            });

            test('fail', () => {
                const next = optimisticReducer(state, fail);

                expect(next.state).toStrictEqual(initial.state);
                expect(next.transitions).toStrictEqual([updateTransition(stage, { failed: true })]);
                expect(selectOptimistic(selectState)(next)).toEqual({});
                expect(selectIsOptimistic(item.id)(next)).toBe(true);
                expect(selectIsFailed(item.id)(next)).toBe(true);
                expect(selectIsConflicting(item.id)(next)).toBe(false);
            });

            test('noop: delete item already deleted server-side', () => {
                /** Simulate server deleting the item via a non-transition action
                 * (e.g., websocket sync) while a delete is staged. The pending
                 * delete replays as a noop (item gone) and gets discarded. */
                const next = optimisticReducer(state, sync({}));

                expect(next.state).toStrictEqual({});
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toEqual({});
                expect(selectIsOptimistic(item.id)(next)).toBe(false);
            });
        });
    });

    describe('update', () => {
        const item = createItem();
        const conflictItem = { ...item, revision: -1 };
        const updatedItem = { ...item, revision: 2, value: 'updated value' };
        const amendedItem = { ...updatedItem, value: 'amended value' };

        const stage = edit.stage(updatedItem);
        const amend = edit.amend(updatedItem.id, amendedItem);
        const fail = edit.fail(updatedItem.id, new Error());
        const stash = edit.stash(updatedItem.id);
        const commit = edit.commit(updatedItem.id);
        const conflict = edit.stage(conflictItem);

        const initial = buildTransitionState(<TestIndexedState>{ [item.id]: item }, []);
        const state = optimisticReducer(initial, stage);

        describe('stage', () => {
            test('should stage transition without modifying state', () => {
                expect(state.state).toStrictEqual(initial.state);
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual({ [item.id]: updatedItem });
                expect(selectIsOptimistic(item.id)(state)).toBe(true);
                expect(selectIsFailed(item.id)(state)).toBe(false);
                expect(selectIsConflicting(item.id)(state)).toBe(false);
            });

            test('amend', () => {
                const next = optimisticReducer(state, amend);

                expect(next.state).toStrictEqual(initial.state);
                expect(next.transitions).toStrictEqual([toStaged(amend)]);
                expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: amendedItem });
                expect(selectIsOptimistic(item.id)(next)).toBe(true);
                expect(selectIsFailed(item.id)(next)).toBe(false);
                expect(selectIsConflicting(item.id)(next)).toBe(false);
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);

                expect(next.state).toStrictEqual({ [item.id]: updatedItem });
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: updatedItem });
                expect(selectIsOptimistic(item.id)(next)).toBe(false);
                expect(selectIsFailed(item.id)(next)).toBe(false);
                expect(selectIsConflicting(item.id)(next)).toBe(false);
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);

                expect(next.state).toStrictEqual({ [item.id]: item });
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: item });
                expect(selectIsOptimistic(item.id)(next)).toBe(false);
                expect(selectIsFailed(item.id)(next)).toBe(false);
                expect(selectIsConflicting(item.id)(next)).toBe(false);
            });

            test('fail', () => {
                const next = optimisticReducer(state, fail);

                expect(next.state).toStrictEqual(initial.state);
                expect(next.transitions).toStrictEqual([updateTransition(stage, { failed: true })]);
                expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: updatedItem });
                expect(selectIsOptimistic(item.id)(next)).toBe(true);
                expect(selectIsFailed(item.id)(next)).toBe(true);
                expect(selectIsConflicting(item.id)(next)).toBe(false);
            });

            test('conflict', () => {
                const next = [conflict].reduce((prev, action) => optimisticReducer(prev, action), state);

                expect(next.state).toStrictEqual({ [item.id]: item });
                expect(next.transitions).toStrictEqual([updateTransition(conflict, { conflict: true })]);
                expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: conflictItem });
                expect(selectIsOptimistic(item.id)(next)).toBe(true);
                expect(selectIsFailed(item.id)(next)).toBe(false);
                expect(selectIsConflicting(item.id)(next)).toBe(true);
            });
        });
    });
});
