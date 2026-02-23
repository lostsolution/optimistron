import type { NestedRecordStateOptions, RecordStateOptions, StateHandler, StringKeys } from '~/state.types';
import type { RecordState, RecursiveRecordState } from './record.types';

import { OptimisticMergeResult } from '~/transitions';

/** Maps a keys tuple to a tuple of string IDs — one per nesting level */
type PathIds<Keys extends readonly string[]> = { [K in keyof Keys]: string } & string[];

/** Internal shorthand for untyped nested record traversal */
type Obj = Record<string, unknown>;

/** Walks the nested state to retrieve the leaf value at the given path */
const getAt = (state: Obj, ids: string[]): unknown => {
    let current: unknown = state;
    for (const id of ids) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Obj)[id];
    }
    return current;
};

/** Immutable set at a nested path, creating intermediate records as needed */
const setAt = (state: Obj | undefined, ids: string[], value: unknown): Obj => {
    if (ids.length === 0) return value as Obj;
    const [head, ...tail] = ids;
    const current = state ?? {};
    return { ...current, [head]: setAt(current[head] as Obj | undefined, tail, value) };
};

/** Immutable delete at a nested path. Returns same reference if key doesn't exist. */
const removeAt = <S extends Obj>(state: S, ids: string[]): S => {
    if (ids.length === 0) return state;
    if (ids.length === 1) {
        const key = ids[0];
        if (!(key in state)) return state;
        const next = { ...state };
        delete next[key];
        return next as S;
    }

    const [head, ...tail] = ids;
    const child = state[head];
    if (!child || typeof child !== 'object') return state;
    const nextChild = removeAt(child as Obj, tail);
    if (nextChild === child) return state;
    return { ...state, [head]: nextChild } as S;
};

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
    }: NestedRecordStateOptions<T, Keys>): StateHandler<
        RecursiveRecordState<Keys, T>,
        [item: T],
        [...PathIds<Keys>, Partial<T>],
        [...PathIds<Keys>]
    > => {
        type State = RecursiveRecordState<Keys, T>;

        /** Extracts path IDs from an item using the keys tuple */
        const extractPath = (item: T): string[] => keys.map((k) => item[k]);

        /** Recursive merge at a given depth. `depth` counts down from `keys.length`.
         * Defers the `{ ...existing }` spread until the first mutation is detected
         * so that SKIP and CONFLICT paths allocate nothing. */
        const mergeAtDepth = (existing: Obj, incoming: Obj, depth: number): Obj => {
            let merged: Obj | undefined;

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
            create: (state, item) => setAt(state, extractPath(item), item) as State,

            update: (state, ...args) => {
                const ids = (args as unknown[]).slice(0, keys.length) as string[];
                const partial = args[keys.length] as Partial<T>;
                const existing = getAt(state, ids) as T | undefined;
                if (!existing) return state;
                return setAt(state, ids, { ...existing, ...partial }) as State;
            },

            remove: (state, ...args) => {
                const ids = (args as unknown[]).slice(0, keys.length) as string[];
                return removeAt(state, ids);
            },

            merge: (existing, incoming) => mergeAtDepth(existing, incoming, keys.length) as State,
        } as StateHandler<State, [item: T], [...PathIds<Keys>, Partial<T>], [...PathIds<Keys>]>;
    };

/** Creates a `StateHandler` for a flat record-based state (`Record<string, T>`).
 * This is a depth-1 specialization of `nestedRecordState`. */
export const recordState = <T extends Record<string, any>>({
    key,
    compare,
    eq,
}: RecordStateOptions<T>): StateHandler<
    RecordState<T>,
    [item: T],
    [itemId: string, partialItem: Partial<T>],
    [itemId: string]
> => {
    const nested = nestedRecordState<T>()({ keys: [key], compare, eq });

    return {
        create: nested.create,
        merge: nested.merge,
        update: (state, itemId, partialItem) => nested.update(state, itemId, partialItem),
        remove: (state, itemId) => nested.remove(state, itemId),
    };
};
