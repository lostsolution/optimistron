import type { StateHandler, StateHandlerOptions } from '~state';
import { OptimisticMergeResult } from '~transitions';

export type IndexedState<T> = Record<string, T>;

/**
 * Creates a `StateHandler` for a indexed record based state with depth 1.
 * - `itemIdKey` parameter is used for determining which key should be used for indexing the record state.
 * - `compare` function allows determining if an incoming item is conflicting with its previous value. Your item
 *   data structure must hence support some kind of versioning or timestamping in order to leverage this.
 */
export const indexedStateFactory = <T extends Record<string, any>>({
    itemIdKey,
    compare,
    eq,
}: StateHandlerOptions<T>): StateHandler<
    IndexedState<T>,
    [item: T],
    [itemId: string, partialItem: Partial<T>],
    [itemId: string]
> => {
    return {
        /*  Handles creating a new item in the state */
        create: (state: IndexedState<T>, item: T) => ({ ...state, [item[itemIdKey]]: item }),

        /* Handles updating an existing item in the state. Ensures the item exists to
         * correctly treat optimistic edits as no-ops when editing a non-existing item,
         * important for resolving noop edits as skippable mutations */
        update: (state: IndexedState<T>, itemId: string, partialItem: Partial<T>) =>
            state[itemId] ? { ...state, [itemId]: { ...state[itemId], ...partialItem } } : state,

        /* Handles deleting an item from state. Checks if the item exists in the state or
         * else no-ops. Important for resolving noop deletes as skippable mutations */
        remove: (state: IndexedState<T>, itemId: string) => {
            if (state[itemId]) {
                const nextState = { ...state };
                delete nextState[itemId];
                return nextState;
            }

            return state;
        },

        /** Merges the current state with incoming changes while handling conflicts,
         * deletions, creations, and valid updates.
         *
         * Note: This merging function performs two iterations over each state.
         * The first iteration checks for potential deletion mutations, and the second
         * iteration handles creations and updates. Updates require validation, ensuring
         * that an incoming update is "greater" than the existing entry, as determined
         * by the `compare` function. If incoming and existing items are equal (as per the
         * `eq` implementation), the update is skipped.
         *
         * Important: If your state is very large, be aware that the strategy employed by
         * optimistron may not be well-suited for such scenarios  */
        merge: (existing: IndexedState<T>, incoming: IndexedState<T>) => {
            const mergedState = { ...existing };

            let mutated = false; /* keep track of mutations */

            /* First iteration over existing items is to check
             * for potential deletion mutations */
            for (const itemId in existing) {
                if (!incoming[itemId]) {
                    mutated = true;
                    delete mergedState[itemId];
                }
            }

            /** Second iteration over incoming items is to
             * check for creation and update mutations */
            for (const itemId in incoming) {
                const existingItem = existing[itemId];
                const incomingItem = incoming[itemId];

                if (existingItem === incomingItem) continue;

                if (!existingItem) {
                    mutated = true;
                    mergedState[itemId] = incomingItem;
                    continue;
                }

                const check = compare(incomingItem)(existingItem);

                if (check === -1) throw OptimisticMergeResult.CONFLICT;
                if (check === 0) {
                    /** If items are equal according to the `compare` function
                     * but do not pass the `eq` check, then we have a conflict */
                    if (eq(incomingItem)(existingItem)) continue;
                    else throw OptimisticMergeResult.CONFLICT;
                }

                /* valid update */
                mutated = true;
                mergedState[itemId] = incomingItem;
            }

            /** If no mutation has been detected at this point then
             * the transition was a noop - skip it */
            if (!mutated) throw OptimisticMergeResult.SKIP;
            return mergedState;
        },
    };
};
