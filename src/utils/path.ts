import type { Maybe } from './types';

/** Internal shorthand for untyped nested object traversal */
export type Obj = Record<string, unknown>;

/** Walks a nested object to retrieve the leaf value at the given path */
export const getAt = (state: Obj, ids: string[]): unknown => {
    let current: unknown = state;
    for (const id of ids) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Obj)[id];
    }
    return current;
};

/** Immutable set at a nested path, creating intermediate records as needed */
export const setAt = (state: Maybe<Obj>, ids: string[], value: unknown): Obj => {
    if (ids.length === 0) return value as Obj;
    const [head, ...tail] = ids;
    const current = state ?? {};
    return { ...current, [head]: setAt(current[head] as Maybe<Obj>, tail, value) };
};

/** Immutable delete at a nested path. Returns same reference if key doesn't exist. */
export const removeAt = <S extends Obj>(state: S, ids: string[]): S => {
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
