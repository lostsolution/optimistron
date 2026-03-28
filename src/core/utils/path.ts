import type { Maybe } from './types';

/** Internal shorthand for untyped nested object traversal */
export type Obj = Record<string, unknown>;

/** Recursively peels Record layers to resolve the leaf type at a path.
 *  Like `(car (cdr (cdr ...)))` — base case returns `S`, each step
 *  strips one `Record<string, _>` wrapper per path element. */
export type RecordAt<S, P extends string[]> = P extends [string, ...infer Rest extends string[]]
    ? S extends Record<string, infer V>
        ? RecordAt<V, Rest>
        : undefined
    : S;

/** Safely narrows unknown to Obj — single guard for all path traversal */
const asObj = (value: unknown): Maybe<Obj> => (value != null && typeof value === 'object' ? (value as Obj) : undefined);

/** Walks a nested object to retrieve the leaf value at the given path */
export const getAt = <T extends Obj, P extends string[]>(state: T, ids: [...P]): Maybe<RecordAt<T, P>> => {
    let current: unknown = state;
    for (const id of ids) {
        const obj = asObj(current);
        if (!obj) return undefined;
        current = obj[id];
    }
    return current as RecordAt<T, P>;
};

/** Immutable set at a nested path, creating intermediate records as needed */
export const setAt = <T extends Obj>(state: Maybe<T>, ids: string[], value: unknown): T => {
    if (ids.length === 0) return value as T;
    const [head, ...tail] = ids;
    const current = (state ?? {}) as T;
    return { ...current, [head]: setAt(asObj(current[head]), tail, value) } as T;
};

/** Immutable delete at a nested path. Returns same reference if key doesn't exist. */
export const removeAt = <T extends Obj>(state: T, ids: string[]): T => {
    if (ids.length === 0) return state;

    if (ids.length === 1) {
        const key = ids[0];
        if (!(key in state)) return state;

        const next = { ...state };
        delete next[key];
        return next as T;
    }

    const [head, ...tail] = ids;
    const child = asObj(state[head]);

    if (!child) return state;
    const nextChild = removeAt(child, tail);

    if (nextChild === child) return state;
    return { ...state, [head]: nextChild } as T;
};
