import { OptimisticMergeResult } from '~/transitions';
import type { MaybeNull } from '~/utils/types';
import type { CrudActionMap, VersioningOptions, WiredStateHandler } from './types';

export type SingularStateOptions<T> = VersioningOptions<T>;

/**
 * Creates a `StateHandler` for single-object state (`MaybeNull<T>`).
 * Suited for cases like user profile, settings, or any singleton entity.
 * - `compare` determines if an incoming item is newer/conflicting
 * - `eq` checks deep equality beyond versioning */
export const singularState = <T extends object>(
    options: SingularStateOptions<T>,
): WiredStateHandler<MaybeNull<T>, T, Partial<T>, void, CrudActionMap<T, Partial<T>, void>> => {
    const { compare, eq } = options;

    return {
        create: (_: MaybeNull<T>, item: T) => item,
        update: (state: MaybeNull<T>, partial: Partial<T>) => (state ? { ...state, ...partial } : state),
        remove: (state: MaybeNull<T>) => (state !== null ? null : state),

        wire: (bound, action, actions) => {
            if (actions.create?.match(action)) return bound.create(action.payload);
            if (actions.update?.match(action)) return bound.update(action.payload);
            if (actions.remove?.match(action)) return bound.remove(undefined as void);
            return undefined;
        },

        merge: (existing: MaybeNull<T>, incoming: MaybeNull<T>) => {
            if (existing === incoming) throw OptimisticMergeResult.SKIP;

            /** null → null is referentially equal (caught above).
             * null → T or T → null are valid creation/deletion mutations. */
            if (existing === null || incoming === null) return incoming;

            /** Both non-null — use versioning logic */
            const check = compare(incoming, existing);

            if (check === -1) throw OptimisticMergeResult.CONFLICT;
            if (check === 0) {
                if (eq(incoming, existing)) throw OptimisticMergeResult.SKIP;
                else throw OptimisticMergeResult.CONFLICT;
            }

            return incoming;
        },
    };
};
