import type { StagedAction } from '~/transitions';
import type { Maybe } from '~/utils/types';

export type TransitionState<T> = {
    committed: T;
    transitions: StagedAction[];
};

export type VersioningOptions<T> = {
    /** Given two items returns a sorting result.
     * This allows checking for valid updates or conflicts.
     * Return -1 if `a` is "smaller" than `b`
     * Return 0 if `a` equals `b`
     * Return 1 if `b` is "greater" than `a` */
    compare: (a: T, b: T) => 0 | 1 | -1;
    /** Equality checker - it can potentially be different
     * than comparing. */
    eq: (a: T, b: T) => boolean;
};

/** Type-narrowing action matcher — `.match()` narrows the action's payload.
 * Input accepts any action shape (index signature) to avoid excess property errors. */
export type ActionMatcher<P = unknown> = {
    match(action: { type: string; [key: string]: unknown }): action is { type: string; payload: P; [key: string]: unknown };
};

/** CRUD action map with typed payloads per operation */
export type CrudActionMap<CP = unknown, UP = unknown, RP = unknown> = {
    create?: ActionMatcher<CP>;
    update?: ActionMatcher<UP>;
    remove?: ActionMatcher<RP>;
};

export interface StateHandler<S, C = any, U = any, D = any> {
    create: (state: S, dto: C) => S;
    update: (state: S, dto: U) => S;
    remove: (state: S, dto: D) => S;
    merge: (current: S, incoming: S) => S;
}

/** StateHandler extended with auto-wired CRUD support.
 * `wire` receives the fully-typed `BoundStateHandler` — all type params
 * are inherited from `StateHandler`, so inference works at call sites. */
export interface WiredStateHandler<S, C = any, U = any, D = any, Actions = any> extends StateHandler<S, C, U, D> {
    wire: (
        bound: BoundStateHandler<S, C, U, D>,
        action: {
            type: string;
            [key: string]: unknown;
        },
        actions: Actions,
    ) => Maybe<S>;
}

export interface BoundStateHandler<S, C = any, U = any, D = any> {
    create: (dto: C) => S;
    update: (dto: U) => S;
    remove: (dto: D) => S;
    merge: (incoming: S) => S;
    getState: () => S;
}
