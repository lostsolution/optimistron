import { OptimisticMergeResult } from '~/transitions';
import type { StringKeys } from '~/utils/types';
import { resolveCompare, type CrudActionMap, type VersioningOptions, type WiredStateHandler } from '~state/types';

export type ListStateOptions<T> = VersioningOptions<T> & { key: StringKeys<T> };

/**
 * Creates a `StateHandler` for ordered list state (`T[]`).
 * Items are identified by a string key property on `T`.
 * Useful when insertion order matters or consumers need array semantics.
 * Handler types use `Partial<T>` for update/remove DTOs — narrower types
 * are enforced at dispatch time via `crudPrepare`.
 * - `compare` determines if an incoming item is newer/conflicting
 * - `eq` checks deep equality beyond versioning
 */
export const listState = <T extends Record<string, any>>(
    options: ListStateOptions<T>,
): WiredStateHandler<T[], T, Partial<T>, Partial<T>, CrudActionMap<T, Partial<T>, Partial<T>>> => {
    const { key, eq } = options;
    const compare = resolveCompare(options);

    return {
        create: (state: T[], item: T) => {
            if (state.some((entry) => entry[key] === item[key])) return state;
            return [...state, item];
        },

        update: (state: T[], dto: Partial<T>) => {
            const itemId = String(dto[key]);
            const idx = state.findIndex((entry) => entry[key] === itemId);
            if (idx === -1) return state;

            const next = [...state];
            next[idx] = { ...state[idx], ...dto };
            return next;
        },

        remove: (state: T[], dto: Partial<T>) => {
            const itemId = String(dto[key]);
            const idx = state.findIndex((entry) => entry[key] === itemId);
            if (idx === -1) return state;
            return state.filter((_, i) => i !== idx);
        },

        wire: (bound, action, actions) => {
            if (actions.create?.match(action)) return bound.create(action.payload);
            if (actions.update?.match(action)) return bound.update(action.payload);
            if (actions.remove?.match(action)) return bound.remove(action.payload);
            return undefined;
        },

        merge: (existing: T[], incoming: T[]) => {
            if (existing === incoming) throw OptimisticMergeResult.SKIP;

            const existingMap = new Map<string, T>();
            for (const item of existing) existingMap.set(item[key], item);

            let matched = 0;
            let hasUpdate = false;

            for (const item of incoming) {
                const prev = existingMap.get(item[key]);

                if (!prev) continue;
                matched++;

                if (prev === item) continue;

                const check = compare(item, prev);
                if (check === -1) throw OptimisticMergeResult.CONFLICT;
                if (check === 0) {
                    if (!eq(item, prev)) throw OptimisticMergeResult.CONFLICT;
                    continue;
                }

                hasUpdate = true;
            }

            /** All matched items were equal — check for additions or deletions via count */
            if (!hasUpdate && matched === incoming.length && matched === existingMap.size) throw OptimisticMergeResult.SKIP;
            return incoming;
        },
    };
};
