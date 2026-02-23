import type { PathIds } from './types';

/**
 * Factory for CRUD prepare functions that couple transitionId to entityId.
 * This is the recommended default for indexed state — transitionId === entityId
 * means dispatching `stage(entity)` automatically tracks the transition by the
 * entity's own ID.
 *
 * Single-key overload (unchanged):
 * ```ts
 * const crud = crudPrepare<Item>('id');
 * ```
 *
 * Multi-key overload (curried for Keys inference):
 * ```ts
 * const crud = crudPrepare<Item>()(['groupId', 'itemId']);
 * ```
 *
 * Multi-key derives transitionId by joining path IDs with `/`.
 *
 * For edge-cases where transitionId must differ from entityId (batch
 * operations, server-assigned IDs with correlation tokens), write custom
 * prepare functions and pass transitionId explicitly as the first argument. */
export function crudPrepare<T extends Record<string, any>>(): <
    const Keys extends readonly [keyof T & string, ...(keyof T & string)[]],
>(
    keys: Keys,
) => {
    create: (item: T) => { payload: { item: T }; transitionId: string };
    update: (...args: [...PathIds<Keys>, Partial<T>]) => {
        payload: { path: PathIds<Keys>; item: Partial<T> };
        transitionId: string;
    };
    remove: (...args: PathIds<Keys>) => { payload: { path: PathIds<Keys> }; transitionId: string };
};

export function crudPrepare<T extends Record<string, any>>(
    key: keyof T & string,
): {
    create: (item: T) => { payload: { item: T }; transitionId: string };
    update: (id: string, item: Partial<T>) => { payload: { id: string; item: Partial<T> }; transitionId: string };
    remove: (id: string) => { payload: { id: string }; transitionId: string };
};

export function crudPrepare<T extends Record<string, any>>(key?: keyof T & string) {
    if (key !== undefined) {
        return {
            create: (item: T) => ({ payload: { item }, transitionId: String(item[key]) }),
            update: (id: string, item: Partial<T>) => ({ payload: { id, item }, transitionId: id }),
            remove: (id: string) => ({ payload: { id }, transitionId: id }),
        };
    }

    return <const Keys extends readonly [keyof T & string, ...(keyof T & string)[]]>(keys: Keys) => ({
        create: (item: T) => ({
            payload: { item },
            transitionId: keys.map((k) => String(item[k])).join('/'),
        }),
        update: (...args: [...PathIds<Keys>, Partial<T>]) => {
            const path = args.slice(0, keys.length) as unknown as PathIds<Keys>;
            const item = args[keys.length] as Partial<T>;
            return { payload: { path, item }, transitionId: (path as string[]).join('/') };
        },
        remove: (...args: PathIds<Keys>) => ({
            payload: { path: args },
            transitionId: (args as unknown as string[]).join('/'),
        }),
    });
}
