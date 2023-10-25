import { OptimisticMergeResult } from '../mutations';

export type EntryState<T> = Record<string, T>;

export const entryStateHandlerFactory = <T extends { [key: string]: any }>(
    itemIdKey: keyof T,
    compare: (existing: T, incoming: T) => boolean,
) => {
    return {
        /*  Handles creating a new item in the state */
        create: (state: EntryState<T>, item: T) => ({ ...state, [item[itemIdKey]]: item }),

        /* Handles updating an existing item in the state. Ensures the item exists to
         * correctly treat optimistic edits as no-ops when editing a non-existing item,
         * important for resolving noop edits as skippable mutations */
        update: (state: EntryState<T>, item: T) =>
            state[item[itemIdKey]] ? { ...state, [item[itemIdKey]]: item } : state,

        /* Handles deleting an item from state. Checks if the item exists in the state or
         * else no-ops. Important for resolving noop deletes as skippable mutations */
        delete: (state: EntryState<T>, itemId: string) => {
            if (state[itemId]) {
                const nextState = { ...state };
                delete nextState[itemId];
                return nextState;
            }

            return state;
        },

        /* Merges the current state with incoming changes while handling conflicts,
         * deletions, creations, and valid updates.  */
        merge: (curr: EntryState<T>, incoming: EntryState<T>) => {
            const mergedState = { ...curr };
            let mutated = false;

            for (const itemId in curr) {
                const incomingItem = incoming[itemId];

                /* item deleted */
                if (!incomingItem) {
                    mutated = true;
                    delete mergedState[itemId];
                }
            }

            for (const itemId in incoming) {
                const incomingItem = incoming[itemId];
                const existingItem = curr[itemId];

                /* item created or valid update */
                if (!existingItem || compare(existingItem, incomingItem)) {
                    mutated = true;
                    mergedState[itemId] = incomingItem;
                } else throw OptimisticMergeResult.CONFLICT;
            }

            if (!mutated) throw OptimisticMergeResult.SKIP;
            return incoming;
        },
    };
};
