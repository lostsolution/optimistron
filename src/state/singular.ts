import type { SingularStateOptions, StateHandler } from '../state.types';
import { OptimisticMergeResult } from '../transitions';

/**
 * Creates a `StateHandler` for single-object state (`T | null`).
 * Suited for cases like user profile, settings, or any singleton entity.
 * - `compare` determines if an incoming item is newer/conflicting
 * - `eq` checks deep equality beyond versioning */
export const singularState = <T extends object>({
    compare,
    eq,
}: SingularStateOptions<T>): StateHandler<T | null, [item: T], [partial: Partial<T>], []> => ({
    create: (_state: T | null, item: T) => item,
    update: (state: T | null, partial: Partial<T>) => (state ? { ...state, ...partial } : state),
    remove: (state: T | null) => (state !== null ? null : state),

    merge: (existing: T | null, incoming: T | null) => {
        if (existing === incoming) throw OptimisticMergeResult.SKIP;

        /** null → null is referentially equal (caught above).
         * null → T or T → null are valid creation/deletion mutations. */
        if (existing === null || incoming === null) return incoming;

        /** Both non-null — use versioning logic */
        const check = compare(incoming)(existing);

        if (check === -1) throw OptimisticMergeResult.CONFLICT;
        if (check === 0) {
            if (eq(incoming)(existing)) throw OptimisticMergeResult.SKIP;
            else throw OptimisticMergeResult.CONFLICT;
        }

        return incoming;
    },
});
