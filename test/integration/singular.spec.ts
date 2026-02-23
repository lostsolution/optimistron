import { describe, expect, test } from 'bun:test';

import { createTransitions } from '~actions';
import { optimistron } from '~optimistron';
import type { HandlerReducer } from '~reducer';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic } from '~selectors';
import { buildTransitionState } from '~state';
import type { TransitionState } from '~state.types';
import { singularState } from '~state/singular';
import { toStaged, updateTransition } from '~transitions';

type Profile = { id: string; name: string; revision: number };

const handler = singularState<Profile>({
    compare: (a) => (b) => {
        if (a.revision > b.revision) return 1;
        if (a.revision === b.revision) return 0;
        return -1;
    },
    eq: (a) => (b) => a.id === b.id && a.name === b.name,
});

const create = createTransitions('profile::create')((item: Profile) => ({ payload: { item } }));
const edit = createTransitions('profile::edit')((partial: Partial<Profile>) => ({ payload: { partial } }));
const remove = createTransitions('profile::remove')(() => ({ payload: {} }));
const sync = (profile: Profile | null) => ({ type: 'sync', payload: { profile } });

const reducer: HandlerReducer<Profile | null, [item: Profile], [partial: Partial<Profile>], []> = (
    { getState, create: c, update, remove: r },
    action,
) => {
    if (create.match(action)) return c(action.payload.item);
    if (edit.match(action)) return update(action.payload.partial);
    if (remove.match(action)) return r();
    if (action.type === 'sync') return (action as ReturnType<typeof sync>).payload.profile;
    return getState();
};

const selectState = ({ state }: TransitionState<Profile | null>) => state;

describe('optimistron', () => {
    const { reducer: optimisticReducer, selectOptimistic } = optimistron('profile', null, handler, reducer);

    describe('singularState', () => {
        describe('create', () => {
            const item: Profile = { id: '1', name: 'Alice', revision: 0 };
            const amendedItem: Profile = { ...item, name: 'Amended' };
            const conflictItem: Profile = { ...item, revision: -1 };

            const stage = create.stage('1', item);
            const amend = create.amend('1', amendedItem);
            const fail = create.fail('1', new Error());
            const stash = create.stash('1');
            const commit = create.commit('1');
            const conflict = create.stage('1', conflictItem);

            const initial = buildTransitionState<Profile | null>(null, []);
            const state = optimisticReducer(initial, stage);

            test('stage: should stage without modifying state', () => {
                expect(state.state).toBeNull();
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual(item);
                expect(selectIsOptimistic('1')(state)).toBe(true);
                expect(selectIsFailed('1')(state)).toBe(false);
                expect(selectIsConflicting('1')(state)).toBe(false);
            });

            test('amend', () => {
                const next = optimisticReducer(state, amend);

                expect(next.state).toBeNull();
                expect(next.transitions).toStrictEqual([toStaged(amend)]);
                expect(selectOptimistic(selectState)(next)).toEqual(amendedItem);
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);

                expect(next.state).toEqual(item);
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toEqual(item);
                expect(selectIsOptimistic('1')(next)).toBe(false);
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);

                expect(next.state).toBeNull();
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toBeNull();
            });

            test('conflict', () => {
                const next = [commit, conflict].reduce((prev, action) => optimisticReducer(prev, action), state);

                expect(next.state).toEqual(item);
                expect(next.transitions).toStrictEqual([updateTransition(conflict, { conflict: true })]);
                expect(selectOptimistic(selectState)(next)).toEqual(conflictItem);
                expect(selectIsConflicting('1')(next)).toBe(true);
            });

            test('fail', () => {
                const next = optimisticReducer(state, fail);

                expect(next.state).toBeNull();
                expect(next.transitions).toStrictEqual([updateTransition(stage, { failed: true })]);
                expect(selectOptimistic(selectState)(next)).toEqual(item);
                expect(selectIsFailed('1')(next)).toBe(true);
            });
        });

        describe('delete', () => {
            const item: Profile = { id: '1', name: 'Alice', revision: 0 };

            const stage = remove.stage('1');
            const commit = remove.commit('1');
            const stash = remove.stash('1');

            const initial = buildTransitionState<Profile | null>(item, []);
            const state = optimisticReducer(initial, stage);

            test('stage: should stage deletion without modifying state', () => {
                expect(state.state).toEqual(item);
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toBeNull();
                expect(selectIsOptimistic('1')(state)).toBe(true);
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);

                expect(next.state).toBeNull();
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toBeNull();
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);

                expect(next.state).toEqual(item);
                expect(next.transitions).toStrictEqual([]);
                expect(selectOptimistic(selectState)(next)).toEqual(item);
            });

            test('noop: delete already null', () => {
                const next = optimisticReducer(state, sync(null));

                expect(next.state).toBeNull();
                expect(next.transitions).toStrictEqual([]);
            });
        });

        describe('update', () => {
            const item: Profile = { id: '1', name: 'Alice', revision: 0 };
            const updatedPartial: Partial<Profile> = { name: 'Updated', revision: 2 };
            const updatedItem: Profile = { ...item, ...updatedPartial };

            const stage = edit.stage('1', updatedPartial);
            const commit = edit.commit('1');
            const stash = edit.stash('1');
            const fail = edit.fail('1', new Error());

            const initial = buildTransitionState<Profile | null>(item, []);
            const state = optimisticReducer(initial, stage);

            test('stage: should stage update without modifying state', () => {
                expect(state.state).toEqual(item);
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual(updatedItem);
                expect(selectIsOptimistic('1')(state)).toBe(true);
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);

                expect(next.state).toEqual(updatedItem);
                expect(next.transitions).toStrictEqual([]);
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);

                expect(next.state).toEqual(item);
                expect(next.transitions).toStrictEqual([]);
            });

            test('fail', () => {
                const next = optimisticReducer(state, fail);

                expect(next.state).toEqual(item);
                expect(next.transitions).toStrictEqual([updateTransition(stage, { failed: true })]);
                expect(selectIsFailed('1')(next)).toBe(true);
            });
        });
    });
});
