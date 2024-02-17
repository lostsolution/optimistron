import { afterAll, describe, expect, test } from 'bun:test';

import { optimistron } from '~optimistron';
import { ReducerMap } from '~reducer';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic, selectOptimistic } from '~selectors';
import { create, createItem, indexedState, reducer, selectState } from '~test/utils';
import { toStaged, updateTransition } from '~transitions';

describe('optimistron', () => {
    afterAll(() => ReducerMap.clear());

    const optimisticReducer = optimistron('test', {}, indexedState, reducer);
    const initial = optimisticReducer(undefined, { type: 'INIT' });

    describe('IndexedState', () => {
        describe('create', () => {
            describe('stage', () => {
                const item = createItem();
                const conflictItem = { ...item, revision: -1 };
                const amendedItem = { ...item, value: 'amended value' };

                const stage = create.stage(item.id, item);
                const amend = create.amend(item.id, amendedItem);
                const fail = create.fail(item.id, new Error());
                const stash = create.stash(item.id);
                const commit = create.commit(item.id);
                const conflict = create.stage(item.id, conflictItem);

                const state = optimisticReducer(initial, stage);

                expect(state.state).toStrictEqual(initial.state);
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual({ [item.id]: item });
                expect(selectIsOptimistic(item.id)(state)).toBe(true);
                expect(selectIsFailed(item.id)(state)).toBe(false);
                expect(selectIsConflicting(item.id)(state)).toBe(false);

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

                    expect(next.state).toStrictEqual(initial.state);
                    expect(next.transitions).toStrictEqual([updateTransition(stage, { failed: true })]);
                    expect(selectOptimistic(selectState)(next)).toEqual({ [item.id]: item });
                    expect(selectIsOptimistic(item.id)(next)).toBe(true);
                    expect(selectIsFailed(item.id)(next)).toBe(true);
                    expect(selectIsConflicting(item.id)(next)).toBe(false);

                    test('stage', () => {
                        const nextAfterRestage = optimisticReducer(next, stage);

                        expect(nextAfterRestage.state).toStrictEqual(initial.state);
                        expect(nextAfterRestage.transitions).toStrictEqual([stage]);
                        expect(selectOptimistic(selectState)(nextAfterRestage)).toStrictEqual({ [item.id]: item });
                        expect(selectIsOptimistic(item.id)(nextAfterRestage)).toBe(true);
                        expect(selectIsFailed(item.id)(nextAfterRestage)).toBe(false);
                        expect(selectIsConflicting(item.id)(nextAfterRestage)).toBe(false);
                    });

                    test('amend', () => {
                        const nextAfterAmend = optimisticReducer(next, amend);

                        expect(nextAfterAmend.state).toStrictEqual(initial.state);
                        expect(nextAfterAmend.transitions).toStrictEqual([toStaged(amend, { failed: true })]);
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
});
