import type { Action, ActionCreatorWithPreparedPayload, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import { META_KEY } from './constants';
import type { Transition, TransitionMeta, TransitionNamespace, WithTransition } from './transitions';
import { DedupeMode, Operation, getTransitionMeta, isTransitionForNamespace } from './transitions';

type EmptyPayload = { payload: never };
type PA_Empty = () => EmptyPayload;
type PA_Error = (error: unknown) => EmptyPayload & { error: Error };

const emptyPA = () => ({ payload: {} });
const errorPA = (error: unknown) => ({ error: error instanceof Error ? error.message : error, payload: {} });

/** Extracts the payload type from a PrepareAction */
type PreparePayload<PA extends PrepareAction<any>> = ReturnType<PA>['payload'];

/** Extracts the error type from a PrepareAction, or `never` if none */
type PrepareError<PA extends PrepareAction<any>> = ReturnType<PA> extends { error: infer E } ? E : never;

/** Merges transition meta with any extra meta from a PrepareAction */
type ActionMeta<Op extends Operation, PA extends PrepareAction<any>> = TransitionMeta<Op> &
    (ReturnType<PA> extends { meta: infer M } ? M : object);

/** Resolves the arguments signature for a transition action creator.
 * STAGE auto-detects transitionId when prepare returns it;
 * all other operations require explicit transitionId as first arg. */
type TransitionArgs<Op extends Operation, PA extends PrepareAction<any>> = Op extends Operation.STAGE
    ? ReturnType<PA> extends { transitionId: string }
        ? Parameters<PA>
        : [transitionId: string, ...Parameters<PA>]
    : [transitionId: string, ...Parameters<PA>];

export type TransitionWithPreparedPayload<
    ActionType extends TransitionNamespace,
    Op extends Operation,
    PA extends PrepareAction<any>,
> = ActionCreatorWithPreparedPayload<
    TransitionArgs<Op, PA>,
    PreparePayload<PA>,
    ActionType,
    PrepareError<PA>,
    ActionMeta<Op, PA>
>;

export type TransitionPayloadAction<
    Type extends string,
    Op extends Operation,
    PA extends PrepareAction<any>,
> = PayloadAction<PreparePayload<PA>, Type, ActionMeta<Op, PA>, PrepareError<PA>>;

/** Helper action matcher function that will match the supplied
 * namespace when the transition operation is of type COMMIT */
const createCommitMatcher =
    <Type extends string, PA extends PrepareAction<any>>(namespace: Type) =>
    (action: Action): action is TransitionPayloadAction<Type, Operation, PA> =>
        isTransitionForNamespace(action, namespace) && getTransitionMeta(action).operation === Operation.COMMIT;

/** Hydrates an action's transition meta definition */
const prepareTransition = <PA extends PrepareAction<any>>(
    action: ReturnType<PA>,
    options: Transition,
): WithTransition<typeof action> => ({
    ...action,
    meta: {
        ...('meta' in action ? action.meta : {}),
        [META_KEY]: options,
    },
});

/** Resolves transitionId and hydrates transition meta onto a prepare result.
 * For STAGE, auto-detects transitionId from prepare result when it returns
 * `transitionId` — coupling transitionId to entityId for the common CRUD case.
 * All other operations require explicit transitionId as the first argument,
 * since they target an existing transition the consumer already holds a
 * reference to. This also avoids a subtle pitfall: amend shares stagePA, so
 * auto-detecting from an amended entity (which may carry a server-assigned ID)
 * would target the wrong transition.
 *
 * For edge-cases where transitionId !== entityId (batch ops, correlation IDs),
 * omit `transitionId` from the prepare return — the explicit path works for
 * all operations including STAGE. */
export const resolveTransition =
    (operation: Operation, dedupe: DedupeMode) =>
    <PA extends PrepareAction<any>>(prepare: PA) =>
    (...args: any[]) => {
        if (operation === Operation.STAGE) {
            const result = prepare(...args);
            if (result && 'transitionId' in result) {
                const id = String(result.transitionId);
                return prepareTransition(result, { id, operation, dedupe });
            }
        }

        const [transitionId, ...rest] = args;
        return prepareTransition(prepare(...rest), { id: transitionId as string, operation, dedupe });
    };

/** Creates a transition action creator by wrapping RTK's `createAction`.
 * Type-cast required due to RTK's `PrepareAction` not supporting the variadic
 * `[transitionId, ...prepareArgs]` signature inference. */
export const createTransition =
    <Type extends TransitionNamespace, Op extends Operation>(
        type: Type,
        operation: Op,
        dedupe: DedupeMode = DedupeMode.OVERWRITE,
    ) =>
    <PA extends PrepareAction<any>>(prepare: PA): TransitionWithPreparedPayload<Type, Op, PA> =>
        createAction(type, resolveTransition(operation, dedupe)(prepare));

/** Generates transition actions for a specified transition type. By default, it uses the
 * `OVERWRITE` dedupe strategy, which overwrites transitions with the same `transitionId` in
 * the transition list. You can provide an action preparator or a configuration object of
 * action preparators for more granular control over the internal transition actions.
 * The resulting matching function will exclusively match COMMIT operations. */
export const createTransitions =
    <Type extends string>(type: Type, dedupe: DedupeMode = DedupeMode.OVERWRITE) =>
    <
        PA_Stage extends PrepareAction<any>,
        PA_Commit extends PrepareAction<any> = PA_Empty,
        PA_Stash extends PrepareAction<any> = PA_Empty,
        PA_Fail extends PrepareAction<any> = PA_Error,
    >(
        options:
            | PA_Stage
            | {
                  stage: PA_Stage;
                  commit?: PA_Commit;
                  fail?: PA_Fail;
                  stash?: PA_Stash;
              },
    ) => {
        const noOptions = typeof options === 'function';
        const stagePA = noOptions ? options : options.stage;
        const commitPA = noOptions ? emptyPA : (options.commit ?? emptyPA);
        const failPA = noOptions ? errorPA : (options.fail ?? errorPA);
        const stashPA = noOptions ? emptyPA : (options.stash ?? emptyPA);

        return {
            amend: createTransition(`${type}::amend`, Operation.AMEND, dedupe)(stagePA),
            stage: createTransition(`${type}::stage`, Operation.STAGE, dedupe)(stagePA),
            commit: createTransition(`${type}::commit`, Operation.COMMIT, dedupe)(commitPA),
            fail: createTransition(`${type}::fail`, Operation.FAIL, dedupe)(failPA),
            stash: createTransition(`${type}::stash`, Operation.STASH, dedupe)(stashPA),
            match: createCommitMatcher<Type, PA_Stage>(type),
        };
    };

/** Factory for CRUD prepare functions that couple transitionId to entityId.
 * This is the recommended default for indexed state — transitionId === entityId
 * means dispatching `stage(entity)` automatically tracks the transition by the
 * entity's own ID. For edge-cases where transitionId must differ from entityId
 * (batch operations, server-assigned IDs with correlation tokens), write custom
 * prepare functions and pass transitionId explicitly as the first argument. */
export const crudPrepare = <T extends Record<string, any>>(itemIdKey: keyof T & string) => ({
    create: (item: T) => ({ payload: { item }, transitionId: String(item[itemIdKey]) }),
    update: (id: string, item: Partial<T>) => ({ payload: { id, item }, transitionId: id }),
    remove: (id: string) => ({ payload: { id }, transitionId: id }),
});
