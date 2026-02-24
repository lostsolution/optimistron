import type { DeleteDTO, UpdateDTO } from './types';

/**
 * Factory for CRUD prepare functions that couple transitionId to entityId.
 * This is the recommended default for indexed state — transitionId === entityId
 * means dispatching `stage(entity)` automatically tracks the transition by the
 * entity's own ID.
 *
 * Single-key overload:
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
export function crudPrepare<T extends Record<string, any>>(): <const Keys extends readonly [keyof T & string, ...(keyof T & string)[]]>(
    keys: Keys,
) => {
    create: (item: T) => { payload: T; transitionId: string };
    update: (dto: UpdateDTO<T, Keys>) => { payload: UpdateDTO<T, Keys>; transitionId: string };
    remove: (dto: DeleteDTO<T, Keys>) => { payload: DeleteDTO<T, Keys>; transitionId: string };
};

export function crudPrepare<T extends Record<string, any>>(
    key: keyof T & string,
): {
    create: (item: T) => { payload: T; transitionId: string };
    update: (dto: Partial<T>) => { payload: Partial<T>; transitionId: string };
    remove: (dto: Partial<T>) => { payload: Partial<T>; transitionId: string };
};

export function crudPrepare<T extends Record<string, any>>(key?: keyof T & string): any {
    if (key !== undefined) {
        return {
            create: (item: T) => ({ payload: item, transitionId: String(item[key]) }),
            update: (dto: Partial<T>) => ({ payload: dto, transitionId: String(dto[key]) }),
            remove: (dto: Partial<T>) => ({ payload: dto, transitionId: String(dto[key]) }),
        };
    }

    return <const Keys extends readonly [keyof T & string, ...(keyof T & string)[]]>(keys: Keys) => ({
        create: (item: T) => ({
            payload: item,
            transitionId: keys.map((k) => String(item[k])).join('/'),
        }),
        update: (dto: Partial<T>) => ({
            payload: dto,
            transitionId: keys.map((k) => String(dto[k])).join('/'),
        }),
        remove: (dto: Record<string, any>) => ({
            payload: dto,
            transitionId: keys.map((k) => String(dto[k])).join('/'),
        }),
    });
}
