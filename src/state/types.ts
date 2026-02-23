import type { StagedAction } from '~/transitions';

export type TransitionState<T> = {
    state: T;
    transitions: StagedAction[];
};

export type StringKeys<T> = {
    [K in keyof T]: T[K] extends string ? K : never;
}[keyof T] &
    string;

export type VersioningOptions<T> = {
    /** Given two items returns a sorting result.
     * This allows checking for valid updates or conflicts.
     * Return -1 if `a` is "smaller" than `b`
     * Return 0 if `a` equals `b`
     * Return 1 if `b` is "greater" than `a`*/
    compare: (a: T) => (b: T) => 0 | 1 | -1;
    /** Equality checker - it can potentially be different
     * than comparing. */
    eq: (a: T) => (b: T) => boolean;
};

export type RecordStateOptions<T> = VersioningOptions<T> & { key: StringKeys<T> };
export type SingularStateOptions<T> = VersioningOptions<T>;
export type NestedRecordStateOptions<T, Keys extends readonly StringKeys<T>[]> = VersioningOptions<T> & { keys: Keys };

/** Type-narrowing action matcher — `.match()` narrows the action's payload.
 * Input accepts any action shape (index signature) to avoid excess property errors. */
export type ActionMatcher<P = unknown> = {
    match(action: {
        type: string;
        [key: string]: unknown;
    }): action is { type: string; payload: P; [key: string]: unknown };
};

/** CRUD action map with typed payloads per operation */
export type CrudActionMap<CP = unknown, UP = unknown, RP = unknown> = {
    create?: ActionMatcher<CP>;
    update?: ActionMatcher<UP>;
    remove?: ActionMatcher<RP>;
};

export interface StateHandler<
    State,
    CreateParams extends unknown[],
    UpdateParams extends unknown[],
    DeleteParams extends unknown[],
> {
    create: (state: State, ...args: CreateParams) => State;
    update: (state: State, ...args: UpdateParams) => State;
    remove: (state: State, ...args: DeleteParams) => State;
    merge: (current: State, incoming: State) => State;
}

/** Structural extension for handlers that support auto-wired CRUD.
 * Only carries the CRUD map type — avoids duplicating StateHandler's type params
 * which would confuse TS inference at call sites like `optimistron()`. */
export type WireMethod<A> = {
    wire: (bound: any, action: { type: string; [key: string]: unknown }, actions: A) => any;
};

export interface BoundStateHandler<
    State,
    CreateParams extends unknown[],
    UpdateParams extends unknown[],
    DeleteParams extends unknown[],
> {
    create: (...args: CreateParams) => State;
    update: (...args: UpdateParams) => State;
    remove: (...args: DeleteParams) => State;
    merge: (incoming: State) => State;
    getState: () => State;
}
