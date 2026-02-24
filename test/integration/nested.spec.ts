import { describe, expect, test } from 'bun:test';

import { createTransitions, crudPrepare } from '~actions';
import { optimistron } from '~optimistron';
import type { HandlerReducer } from '~reducer';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic } from '~selectors/selectors';
import { buildTransitionState } from '~state/factory';
import type { TransitionState } from '~state/types';
import { nestedRecordState } from '~state/record';
import type { RecursiveRecordState } from '~state/record';
import { updateTransition } from '~transitions';

type Item = { groupId: string; itemId: string; value: string; revision: number };
type State = RecursiveRecordState<['groupId', 'itemId'], Item>;

const handler = nestedRecordState<Item>()({
    keys: ['groupId', 'itemId'],
    compare: (a) => (b) => {
        if (a.revision > b.revision) return 1;
        if (a.revision === b.revision) return 0;
        return -1;
    },
    eq: (a) => (b) => a.value === b.value,
});

const crud = crudPrepare<Item>()(['groupId', 'itemId']);

const add = createTransitions('nested::add')(crud.create);
const edit = createTransitions('nested::edit')(crud.update);
const remove = createTransitions('nested::remove')(crud.remove);

const reducer: HandlerReducer<State, [item: Item], [string, string, Partial<Item>], [string, string]> = ({ getState, create, update, remove: r }, action) => {
    if (add.match(action)) return create(action.payload.item);
    if (edit.match(action)) return update(action.payload.path[0], action.payload.path[1], action.payload.item);
    if (remove.match(action)) return r(action.payload.path[0], action.payload.path[1]);
    return getState();
};

const selectState = ({ state }: TransitionState<State>) => state;

describe('optimistron', () => {
    const initialState: State = {};
    const { reducer: optimisticReducer, selectOptimistic } = optimistron('nested', initialState, handler, reducer);

    describe('nestedRecordState', () => {
        describe('create', () => {
            const item: Item = { groupId: 'g1', itemId: 'i1', value: 'test', revision: 0 };
            const conflictItem: Item = { ...item, revision: -1 };

            const stage = add.stage(item);
            const fail = add.fail('g1/i1', new Error());
            const stash = add.stash('g1/i1');
            const commit = add.commit('g1/i1');
            const conflict = add.stage(conflictItem);

            const initial = buildTransitionState<State>({}, []);
            const state = optimisticReducer(initial, stage);

            test('stage: should stage without modifying state', () => {
                expect(state.state).toStrictEqual({});
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual({ g1: { i1: item } });
                expect(selectIsOptimistic('g1/i1')(state)).toBe(true);
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);
                expect(next.state).toEqual({ g1: { i1: item } });
                expect(next.transitions).toStrictEqual([]);
                expect(selectIsOptimistic('g1/i1')(next)).toBe(false);
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);
                expect(next.state).toStrictEqual({});
                expect(next.transitions).toStrictEqual([]);
            });

            test('fail', () => {
                const next = optimisticReducer(state, fail);
                expect(next.state).toStrictEqual({});
                expect(next.transitions).toStrictEqual([updateTransition(stage, { failed: true })]);
                expect(selectIsFailed('g1/i1')(next)).toBe(true);
            });

            test('conflict', () => {
                const next = [commit, conflict].reduce((prev, action) => optimisticReducer(prev, action), state);
                expect(next.state).toEqual({ g1: { i1: item } });
                expect(next.transitions).toStrictEqual([updateTransition(conflict, { conflict: true })]);
                expect(selectIsConflicting('g1/i1')(next)).toBe(true);
            });
        });

        describe('update', () => {
            const item: Item = { groupId: 'g1', itemId: 'i1', value: 'test', revision: 0 };
            const updatedPartial: Partial<Item> = { value: 'updated', revision: 2 };
            const updatedItem: Item = { ...item, ...updatedPartial };

            const stage = edit.stage('g1', 'i1', updatedPartial);
            const commit = edit.commit('g1/i1');
            const stash = edit.stash('g1/i1');

            const initial = buildTransitionState<State>({ g1: { i1: item } }, []);
            const state = optimisticReducer(initial, stage);

            test('stage: should stage update without modifying state', () => {
                expect(state.state).toEqual(initial.state);
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual({ g1: { i1: updatedItem } });
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);
                expect(next.state).toEqual({ g1: { i1: updatedItem } });
                expect(next.transitions).toStrictEqual([]);
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);
                expect(next.state).toEqual(initial.state);
                expect(next.transitions).toStrictEqual([]);
            });
        });

        describe('delete', () => {
            const item: Item = { groupId: 'g1', itemId: 'i1', value: 'test', revision: 0 };

            const stage = remove.stage('g1', 'i1');
            const commit = remove.commit('g1/i1');
            const stash = remove.stash('g1/i1');

            const initial = buildTransitionState<State>({ g1: { i1: item } }, []);
            const state = optimisticReducer(initial, stage);

            test('stage: should stage deletion without modifying state', () => {
                expect(state.state).toEqual(initial.state);
                expect(state.transitions).toStrictEqual([stage]);
                expect(selectOptimistic(selectState)(state)).toEqual({ g1: {} });
            });

            test('commit', () => {
                const next = optimisticReducer(state, commit);
                expect(next.state).toEqual({ g1: {} });
                expect(next.transitions).toStrictEqual([]);
            });

            test('stash', () => {
                const next = optimisticReducer(state, stash);
                expect(next.state).toEqual(initial.state);
                expect(next.transitions).toStrictEqual([]);
            });
        });
    });
});
