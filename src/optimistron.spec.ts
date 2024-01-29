import { createTransitions } from '~actions';
import { optimistron } from '~optimistron';
import { ReducerMap } from '~reducer';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic } from '~selectors';
import { recordHandlerFactory } from '~state/record';
import { updateTransition } from '~transitions';

describe('optimistron', () => {
    beforeEach(() => ReducerMap.clear());

    describe('RecordState', () => {
        type Item = { id: string; value: string; revision: number };

        const createItem = createTransitions('items::add')({ stage: (item: Item) => ({ payload: { item } }) });
        const editItem = createTransitions('items::edit')({ stage: (item: Item) => ({ payload: { item } }) });

        const compare = (a: Item) => (b: Item) => {
            if (a.revision > b.revision) return 1;
            if (a.revision === b.revision) return 0;
            return -1;
        };

        const eq = (a: Item) => (b: Item) => a.id === b.id && a.value === b.value;

        const reducer = optimistron(
            'items',
            {},
            recordHandlerFactory<Item>({ itemIdKey: 'id', compare, eq }),
            ({ getState, create, update }, action) => {
                if (createItem.match(action)) return create(action.payload.item);
                if (editItem.match(action)) return update(action.payload.item.id, action.payload.item);
                return getState();
            },
        );

        const initial = reducer(undefined, { type: 'INIT' });

        describe('create', () => {
            test('stage', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const nextState = reducer(initial, stage);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.transitions).toEqual([stage]);
                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });

            test('stage > fail', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const fail = createItem.fail('001', new Error());
                const nextState = [stage, fail].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.transitions).toEqual([updateTransition(stage, { failed: true })]);
                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(true);
            });

            test('stage > fail > stage', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const fail = createItem.fail('001', new Error());
                const nextState = [stage, fail, stage].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.transitions).toEqual([stage]);
                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });

            test('stage > stash', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const stash = createItem.stash('001');
                const nextState = [stage, stash].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.transitions).toEqual([]);
                expect(selectIsOptimistic('001')(nextState)).toBe(false);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });

            test('stage > commit', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const commit = createItem.commit('001');
                const nextState = [stage, commit].reduce(reducer, initial);

                expect(nextState).toEqual({ state: { ['001']: stage.payload.item } });
                expect(nextState.transitions).toEqual([]);
                expect(selectIsOptimistic('001')(nextState)).toBe(false);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });
        });

        describe('update', () => {
            test('update > noop', () => {
                const update = editItem.stage('002', { id: '002', value: '2', revision: 2 });
                const nextState = [update].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.transitions).toEqual([]);
            });

            test('update > conflict', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 2 });
                const commit = createItem.commit('001');
                const update = editItem.stage('001', { id: '001', value: '2', revision: 1 });
                const nextState = [stage, commit, update].reduce(reducer, initial);

                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(false);
                expect(selectIsConflicting('001')(nextState)).toBe(true);
            });
        });
    });
});
