import type { ActionCreatorWithPreparedPayload, PayloadAction, PrepareAction } from '@reduxjs/toolkit';

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
export type ActionMeta<Op extends Operation, PA extends PrepareAction<any>> = TransitionMeta<Op> &
    (ReturnType<PA> extends { meta: infer M } ? M : object);

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

export type { PathMap as PathIds } from '~/utils/types';
