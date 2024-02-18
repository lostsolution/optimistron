import { createTransitions } from '~actions';
import { REDUCER_KEY } from '~constants';
import type { HandlerReducer } from '~reducer';
import type { TransitionState } from '~state';
import { indexedStateFactory } from '~state/indexed';
import type { StagedAction } from '~transitions';

export type TestItem = { id: string; revision: number; value: string };
export type TestIndexedState = Record<string, TestItem>;

export const createItem = (data?: Partial<TestItem>): TestItem => ({
    id: data?.id ?? Math.round(Math.random() * 1000).toString(),
    revision: data?.revision ?? 0,
    value: data?.value ?? 'test_value',
});

/** testing actions */
export const create = createTransitions('test::add')((item: TestItem) => ({ payload: { item } }));
export const edit = createTransitions('test::edit')((item: TestItem) => ({ payload: { item } }));
export const throwAction = { type: 'throw ' };

export const selectState = ({ state }: TransitionState<TestIndexedState>) => state;

export const indexedState = indexedStateFactory<TestItem>({
    itemIdKey: 'id',
    compare: (a: TestItem) => (b: TestItem) => {
        if (a.revision > b.revision) return 1;
        if (a.revision === b.revision) return 0;
        return -1;
    },
    eq: (a: TestItem) => (b: TestItem) => a.id === b.id && a.value === b.value,
});

export const reducer: HandlerReducer<TestIndexedState, [item: TestItem], [id: string, item: TestItem], never> = (
    handler,
    action,
) => {
    if (action.type === throwAction.type) throw new Error('test error');
    if (create.match(action)) return handler.create(action.payload.item);
    if (edit.match(action)) return handler.update(action.payload.item.id, action.payload.item);

    return handler.getState();
};

export const createIndexedState = (transitions: StagedAction[] = []): TransitionState<TestIndexedState> => ({
    [REDUCER_KEY]: 'test',
    state: {},
    transitions,
});
