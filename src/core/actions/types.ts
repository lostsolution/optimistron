import type { Action, ActionCreatorWithPreparedPayload, PayloadAction, PrepareAction } from '@reduxjs/toolkit';

import type { TransitionMeta, TransitionNamespace } from '~/transitions';
import { type Operation } from '~/transitions';

export type EmptyPayload = { payload: never };
export type PA_Empty = () => EmptyPayload;
export type PA_Error = (error: unknown) => EmptyPayload & { error: Error };

/** Extracts the payload type from a PrepareAction */
export type PreparePayload<PA extends PrepareAction<any>> = ReturnType<PA>['payload'];

/** Extracts the error type from a PrepareAction, or `never` if none */
export type PrepareError<PA extends PrepareAction<any>> = ReturnType<PA> extends { error: infer E } ? E : never;

/** Merges transition meta with any extra meta from a PrepareAction */
export type ActionMeta<Op extends Operation, PA extends PrepareAction<any>> = TransitionMeta<Op> & (ReturnType<PA> extends { meta: infer M } ? M : object);

/** Resolves the arguments signature for a transition action creator.
 * STAGE auto-detects transitionId when prepare returns it;
 * all other operations require explicit transitionId as first arg. */
export type TransitionArgs<Op extends Operation, PA extends PrepareAction<any>> = Op extends Operation.STAGE
    ? ReturnType<PA> extends { transitionId: string }
        ? Parameters<PA>
        : [transitionId: string, ...Parameters<PA>]
    : [transitionId: string, ...Parameters<PA>];

export type TransitionWithPreparedPayload<
    ActionType extends TransitionNamespace,
    Op extends Operation,
    PA extends PrepareAction<any>,
> = ActionCreatorWithPreparedPayload<TransitionArgs<Op, PA>, PreparePayload<PA>, ActionType, PrepareError<PA>, ActionMeta<Op, PA>>;

export type TransitionPayloadAction<Type extends string, Op extends Operation, PA extends PrepareAction<any>> = PayloadAction<
    PreparePayload<PA>,
    Type,
    ActionMeta<Op, PA>,
    PrepareError<PA>
>;

/** Structural constraint for the action map returned by `createTransitions`.
 * Only constrains what the saga effects actually consume: `stage.match` for
 * the watcher, lifecycle methods for dispatch. Rest params use `any` —
 * required for contravariant compatibility with RTK's prepared action creators
 * (a fn accepting `Item` is not assignable to one accepting `unknown`).
 * Payload type safety flows through `InferPayload`, not here. */
export type TransitionActions = {
    stage: { match(action: Action): boolean };
    amend: (...args: any[]) => Action;
    commit: (...args: any[]) => Action;
    fail: (...args: any[]) => Action;
    stash: (...args: any[]) => Action;
};

/** Extracts the stage payload type from a `createTransitions` result.
 * Works via the callable signature on `stage` (which exists on the actual
 * `ActionCreatorWithPreparedPayload` even though the constraint only
 * requires `.match`). */
export type InferPayload<A extends TransitionActions> =
    A extends { stage: (...args: any[]) => { payload: infer P } } ? P : unknown;

export type { PathMap as PathIds } from '~/utils/types';

/** Picks the identity keys from T — the "address" of an entity */
export type ItemPath<T, Keys extends readonly (keyof T & string)[]> = Pick<T, Keys[number]>;

/** Partial update DTO: all fields optional, identity keys required */
export type UpdateDTO<T, Keys extends readonly (keyof T & string)[]> = Partial<T> & ItemPath<T, Keys>;

/** Delete DTO: just the identity keys */
export type DeleteDTO<T, Keys extends readonly (keyof T & string)[]> = ItemPath<T, Keys>;
