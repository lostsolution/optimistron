import type { CrudActionMap, VersioningOptions, WiredStateHandler } from '~state/types';
import type { Maybe, StringKeys } from '~/utils/types';
import type { PathMap } from '~/utils/types';
import type { Obj } from '~/utils/path';
import { getAt, setAt, removeAt } from '~/utils/path';
import { OptimisticMergeResult } from '~/transitions';

export type RecordStateOptions<T> = VersioningOptions<T> & { key: StringKeys<T> };
export type NestedRecordStateOptions<T, Keys extends readonly StringKeys<T>[]> = VersioningOptions<T> & { keys: Keys };

export type RecordState<T> = Record<string, T>;

/** Recursively builds a nested Record type from a keys tuple.
 * `NestedRecord<['groupId', 'itemId'], T>` = `Record<string, Record<string, T>>` */
export type RecursiveRecordState<Keys extends readonly string[], T> = Keys extends readonly [string, ...infer Rest extends string[]]
    ? Rest extends []
        ? Record<string, T>
        : Record<string, RecursiveRecordState<Rest, T>>
    : never;

/** Maps a keys tuple to a typed path object.
 * `PathOf<['groupId', 'itemId']>` = `{ groupId: string; itemId: string }` */
export type PathOf<Keys extends readonly string[]> = { [K in Keys[number]]: string };

/** Typed CRUD action map for nested record state */
type NestedRecordCrudMap<T, Keys extends readonly string[]> = CrudActionMap<{ item: T }, { path: PathMap<Keys>; item: Partial<T> }, { path: PathMap<Keys> }>;

/** Typed CRUD action map for flat record state */
type RecordCrudMap<T> = CrudActionMap<{ item: T }, { id: string; item: Partial<T> }, { id: string }>;

/**
 * Creates a `StateHandler` for nested record-based state.
 * Curried to support partial type application — fix `T`, infer `Keys`:
 * ```ts
 * nestedRecordState<Item>()({ keys: ['groupId', 'itemId'], compare, eq })
 * ```
 * `keys` describes the nesting levels — e.g. `['groupId', 'itemId']` yields
 * `Record<string, Record<string, T>>`. Path IDs for CRUD operations match
 * the keys tuple length.
 * - `compare` and `eq` operate on leaf items of type `T` */
export const nestedRecordState =
    <T extends Record<string, any>>() =>
    <const Keys extends readonly [StringKeys<T>, ...StringKeys<T>[]]>({
        keys,
        compare,
        eq,
    }: NestedRecordStateOptions<T, Keys>): WiredStateHandler<
        RecursiveRecordState<Keys, T>,
        [item: T],
        [path: string[], item: Partial<T>],
        [path: string[]],
        NestedRecordCrudMap<T, Keys>
    > => {
        type State = RecursiveRecordState<Keys, T>;

        /** Extracts path IDs from an item using the keys tuple */
        const extractPath = (item: T): string[] => keys.map((k) => item[k]);

        /** Recursive merge at a given depth. `depth` counts down from `keys.length`.
         * Defers the `{ ...existing }` spread until the first mutation is detected
         * so that SKIP and CONFLICT paths allocate nothing. */
        const mergeAtDepth = (existing: Obj, incoming: Obj, depth: number): Obj => {
            let merged: Maybe<Obj>;

            /** First pass: deletions */
            for (const id in existing) {
                if (!incoming[id]) {
                    merged ??= { ...existing };
                    delete merged[id];
                }
            }

            /** Second pass: creations and updates */
            for (const id in incoming) {
                const existingEntry = existing[id];
                const incomingEntry = incoming[id];

                if (existingEntry === incomingEntry) continue;

                if (!existingEntry) {
                    merged ??= { ...existing };
                    merged[id] = incomingEntry;
                    continue;
                }

                if (depth > 1) {
                    try {
                        /** Intermediate level — recurse */
                        const mergedChild = mergeAtDepth(existingEntry as Obj, incomingEntry as Obj, depth - 1);
                        if (mergedChild !== existingEntry) {
                            merged ??= { ...existing };
                            merged[id] = mergedChild;
                        }
                    } catch (e) {
                        if (e === OptimisticMergeResult.SKIP) continue;
                        throw e;
                    }
                } else {
                    /** Leaf level — use compare/eq */
                    const check = compare(incomingEntry as T)(existingEntry as T);

                    if (check === -1) throw OptimisticMergeResult.CONFLICT;
                    if (check === 0) {
                        if (eq(incomingEntry as T)(existingEntry as T)) continue;
                        else throw OptimisticMergeResult.CONFLICT;
                    }

                    merged ??= { ...existing };
                    merged[id] = incomingEntry;
                }
            }

            if (!merged) throw OptimisticMergeResult.SKIP;
            return merged;
        };

        return {
            create: (state, item) => setAt(state, extractPath(item), item),

            update: (state, path, item) => {
                const existing = getAt(state, path) as Maybe<T>;
                if (!existing) return state;
                return setAt(state, path, { ...existing, ...item });
            },

            remove: (state, path) => removeAt(state, path),

            merge: (existing, incoming) => mergeAtDepth(existing, incoming, keys.length) as State,

            wire: (bound, action, actions) => {
                if (actions.create && actions.create.match(action)) return bound.create(action.payload.item);
                if (actions.update && actions.update.match(action)) return bound.update(action.payload.path, action.payload.item);
                if (actions.remove && actions.remove.match(action)) return bound.remove(action.payload.path);
                return undefined;
            },
        };
    };

/** Creates a `StateHandler` for a flat record-based state (`Record<string, T>`).
 * This is a depth-1 specialization of `nestedRecordState`. */
export const recordState = <T extends Record<string, any>>({
    key,
    compare,
    eq,
}: RecordStateOptions<T>): WiredStateHandler<RecordState<T>, [item: T], [itemId: string, partialItem: Partial<T>], [itemId: string], RecordCrudMap<T>> => {
    const nested = nestedRecordState<T>()({ keys: [key], compare, eq });

    return {
        create: nested.create,
        merge: nested.merge,
        update: (state, itemId, partialItem) => nested.update(state, [itemId], partialItem),
        remove: (state, itemId) => nested.remove(state, [itemId]),

        wire: (bound, action, actions) => {
            if (actions.create && actions.create.match(action)) return bound.create(action.payload.item);
            if (actions.update && actions.update.match(action)) return bound.update(action.payload.id, action.payload.item);
            if (actions.remove && actions.remove.match(action)) return bound.remove(action.payload.id);
            return undefined;
        },
    };
};
