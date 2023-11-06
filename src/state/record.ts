import { StateHandler } from '../state';
import { OptimisticMergeResult } from '../transitions';

export type RecordState<T> = Record<string, T>;

/**
 * Creates a `StateHandler` for a record based state.
 * - `itemIdKey` parameter is used for determining which key should be used for indexing the record state.
 * - `compare` function allows determining if an incoming item is conflicting with its previous value. Your item
 *   data structure must hence support some kind of versioning or timestamping in order to leverage this.
 */
export const recordHandlerFactory = <T extends { [key: string]: any }>(
    itemIdKey: keyof T,
    compare: (existing: T, incoming: T) => boolean,
): StateHandler<RecordState<T>, [item: T], [itemId: string, partialItem: Partial<T>], [itemId: string]> => {
    return {
        /*  Handles creating a new item in the state */
        create: (state: RecordState<T>, item: T) => ({ ...state, [item[itemIdKey]]: item }),

        /* Handles updating an existing item in the state. Ensures the item exists to
         * correctly treat optimistic edits as no-ops when editing a non-existing item,
         * important for resolving noop edits as skippable mutations */
        update: (state: RecordState<T>, itemId: string, partialItem: Partial<T>) =>
            state[itemId] ? { ...state, [itemId]: { ...state[itemId], ...partialItem } } : state,

        /* Handles deleting an item from state. Checks if the item exists in the state or
         * else no-ops. Important for resolving noop deletes as skippable mutations */
        delete: (state: RecordState<T>, itemId: string) => {
            if (state[itemId]) {
                const nextState = { ...state };
                delete nextState[itemId];
                return nextState;
            }

            return state;
        },

        /* Merges the current state with incoming changes while handling conflicts,
         * deletions, creations, and valid updates.  */
        merge: (curr: RecordState<T>, incoming: RecordState<T>) => {
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
