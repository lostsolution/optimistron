import { createOptimisticActions } from '../actions';
import { optimistron } from '../optimistron';
import { OptimisticMergeResult } from '../types';

type Item = { id: string; value: string; revision: number };
type ItemState = Record<string, Item>;

const initial: ItemState = {};

export const createItem = createOptimisticActions('items::add', {
    stage: (item: Item) => ({ payload: { item } }),
});

export const editItem = createOptimisticActions('items::edit', {
    stage: (item: Item) => ({ payload: { item } }),
});

export const reducer = optimistron(
    'items',
    initial,
    {
        create: (state: ItemState, item: Item) => ({ ...state, [item.id]: item }),
        update: (state: ItemState, item: Item) => (state[item.id] ? { ...state, [item.id]: item } : state),
        delete: (state: ItemState, itemId: string) => {
            const nextState = { ...state };
            delete nextState[itemId];
            return nextState;
        },
        merge: (curr: ItemState, incoming: ItemState) => {
            const mergedState = { ...curr };
            let mutated = false;

            /* item deleted */
            for (const itemId in curr) {
                const incomingItem = incoming[itemId];
                if (!incomingItem) {
                    mutated = true;
                    delete mergedState[itemId];
                }
            }

            for (const itemId in incoming) {
                const incomingItem = incoming[itemId];
                const existingItem = curr[itemId];

                /* item created or valid update */
                if (!existingItem || incomingItem.revision > existingItem.revision) {
                    mutated = true;
                    mergedState[itemId] = incomingItem;
                } else throw OptimisticMergeResult.CONFLICT;
            }

            if (!mutated) throw OptimisticMergeResult.SKIP;
            return incoming;
        },
    },
    ({ getState, create, update }, action) => {
        if (createItem.match(action)) return create(action.payload.item);
        if (editItem.match(action)) return update(action.payload.item);
        return getState();
    },
);
