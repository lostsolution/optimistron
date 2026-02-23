import type { CrudActionMap, ListStateOptions, StateHandler, StringKeys, WireMethod } from '~state/types';
import { OptimisticMergeResult } from '~/transitions';

/** Typed CRUD action map for list state */
type ListCrudMap<T> = CrudActionMap<{ item: T }, { id: string; item: Partial<T> }, { id: string }>;

/**
 * Creates a `StateHandler` for ordered list state (`T[]`).
 * Items are identified by a string key property on `T`.
 * Useful when insertion order matters or consumers need array semantics.
 * - `compare` determines if an incoming item is newer/conflicting
 * - `eq` checks deep equality beyond versioning */
export const listState = <T extends Record<string, any>>({
    key,
    compare,
    eq,
}: ListStateOptions<T>): StateHandler<T[], [item: T], [itemId: string, partial: Partial<T>], [itemId: string]> &
    WireMethod<ListCrudMap<T>> => ({
    create: (state: T[], item: T) => {
        if (state.some((entry) => entry[key] === item[key])) return state;
        return [...state, item];
    },

    update: (state: T[], itemId: string, partial: Partial<T>) => {
        const idx = state.findIndex((entry) => entry[key as StringKeys<T>] === itemId);
        if (idx === -1) return state;
        const next = [...state];
        next[idx] = { ...state[idx], ...partial };
        return next;
    },

    remove: (state: T[], itemId: string) => {
        const idx = state.findIndex((entry) => entry[key as StringKeys<T>] === itemId);
        if (idx === -1) return state;
        return state.filter((_, i) => i !== idx);
    },

    wire: (bound, action, actions) => {
        if (actions.create && actions.create.match(action)) return bound.create(action.payload.item);
        if (actions.update && actions.update.match(action)) return bound.update(action.payload.id, action.payload.item);
        if (actions.remove && actions.remove.match(action)) return bound.remove(action.payload.id);
        return undefined;
    },

    merge: (existing: T[], incoming: T[]) => {
        if (existing === incoming) throw OptimisticMergeResult.SKIP;

        const existingMap = new Map<string, T>();
        for (const item of existing) existingMap.set(item[key], item);

        let matched = 0;

        for (const item of incoming) {
            const prev = existingMap.get(item[key]);

            if (!prev) continue;
            matched++;

            if (prev === item) continue;

            const check = compare(item)(prev);
            if (check === -1) throw OptimisticMergeResult.CONFLICT;
            if (check === 0) {
                if (!eq(item)(prev)) throw OptimisticMergeResult.CONFLICT;
                continue;
            }

            return incoming;
        }

        /** All matched items were equal — check for additions or deletions via count */
        if (matched === incoming.length && matched === existingMap.size) throw OptimisticMergeResult.SKIP;
        return incoming;
    },
});
