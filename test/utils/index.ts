import { createTransitions } from '~actions';
import type { HandlerReducer } from '~reducer';
import type { ActionMatcher, TransitionState } from '~state/types';
import { recordState } from '~state/record';
import type { StagedAction } from '~transitions';

/** Test helper — creates a typed ActionMatcher that matches on action.type */
export const matcher = <P>(type: string): ActionMatcher<P> => ({
    match: (action): action is { type: string; payload: P; [key: string]: unknown } => action.type === type,
});

export type TestItem = { id: string; revision: number; value: string };
export type TestIndexedState = Record<string, TestItem>;

export const createItem = (data?: Partial<TestItem>): TestItem => ({
    id: data?.id ?? Math.round(Math.random() * 1000).toString(),
    revision: data?.revision ?? 0,
    value: data?.value ?? 'test_value',
});

/** testing actions */
export const create = createTransitions('test::add')((item: TestItem) => ({ payload: item, transitionId: item.id }));
export const edit = createTransitions('test::edit')((item: TestItem) => ({ payload: item, transitionId: item.id }));
export const remove = createTransitions('test::remove')((dto: Pick<TestItem, 'id'>) => ({ payload: dto, transitionId: dto.id }));
export const sync = (items: TestIndexedState) => ({ type: 'sync', payload: { items } });
export const throwAction = { type: 'throw ' };

export const selectState = ({ committed }: TransitionState<TestIndexedState>) => committed;

export const indexedState = recordState<TestItem>({
    key: 'id',
    compare: (a: TestItem) => (b: TestItem) => {
        if (a.revision > b.revision) return 1;
        if (a.revision === b.revision) return 0;
        return -1;
    },
    eq: (a: TestItem) => (b: TestItem) => a.id === b.id && a.value === b.value,
});

export const reducer: HandlerReducer<TestIndexedState, TestItem, Partial<TestItem>, Partial<TestItem>> = (handler, action): TestIndexedState => {
    if (action.type === throwAction.type) throw new Error('test error');
    if (action.type === 'sync') return (action as ReturnType<typeof sync>).payload.items;
    if (create.match(action)) return handler.create(action.payload);
    if (edit.match(action)) return handler.update(action.payload);
    if (remove.match(action)) return handler.remove(action.payload);

    return handler.getState();
};

export const createIndexedState = (transitions: StagedAction[] = []): TransitionState<TestIndexedState> => ({
    committed: {},
    transitions,
});
