import { TransitionMode } from '~/transitions';
import { crudPrepare } from './crud';
import { createTransitions } from './transitions';

/**
 * High-level helper that composes `crudPrepare` + `createTransitions`
 * with golden-path transition modes:
 * - **create** → `DISPOSABLE` (drop on fail — entity never existed server-side)
 * - **update** → `DEFAULT` (flag on fail — consumer decides)
 * - **remove** → `REVERTIBLE` (stash on fail — undo via trailing reversion)
 *
 * Single-key:
 * ```ts
 * const todo = createCrudTransitions<Todo>('todos', 'id');
 * todo.create.stage(item);
 * todo.update.stage({ id, value: 'new' });
 * todo.remove.stage({ id });
 * ```
 *
 * Multi-key (curried for Keys inference):
 * ```ts
 * const item = createCrudTransitions<Item>()('items', ['groupId', 'itemId']);
 * ```
 */
export function createCrudTransitions<T extends Record<string, any>>(): <const Keys extends readonly [keyof T & string, ...(keyof T & string)[]]>(
    namespace: string,
    keys: Keys,
) => {
    create: ReturnType<typeof createTransitions>;
    update: ReturnType<typeof createTransitions>;
    remove: ReturnType<typeof createTransitions>;
};

export function createCrudTransitions<T extends Record<string, any>>(
    namespace: string,
    key: keyof T & string,
): {
    create: ReturnType<typeof createTransitions>;
    update: ReturnType<typeof createTransitions>;
    remove: ReturnType<typeof createTransitions>;
};

export function createCrudTransitions<T extends Record<string, any>>(namespace?: string, key?: keyof T & string): any {
    const build = (ns: string, crud: ReturnType<typeof crudPrepare<T>>) => ({
        create: createTransitions(`${ns}::create`, TransitionMode.DISPOSABLE)(crud.create),
        update: createTransitions(`${ns}::update`, TransitionMode.DEFAULT)(crud.update),
        remove: createTransitions(`${ns}::remove`, TransitionMode.REVERTIBLE)(crud.remove),
    });

    if (namespace !== undefined && key !== undefined) {
        return build(namespace, crudPrepare<T>(key));
    }

    return <const Keys extends readonly [keyof T & string, ...(keyof T & string)[]]>(ns: string, keys: Keys) => build(ns, crudPrepare<T>()(keys) as any);
}
