import type { Action, ActionCreatorWithPreparedPayload, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import { META_KEY } from './constants';
import type { Transition, TransitionMeta, TransitionNamespace, WithTransition } from './transitions';
import { DedupeMode, Operation, getTransitionMeta, isTransitionForNamespace } from './transitions';

type EmptyPayload = { payload: never };
type PA_Empty = () => EmptyPayload;
type PA_Error = (error: unknown) => EmptyPayload & { error: Error };

export type TransitionWithPreparedPayload<
    Type extends TransitionNamespace,
    Op extends Operation,
    PA extends PrepareAction<any>,
> = ActionCreatorWithPreparedPayload<
    [transitionId: string, ...Parameters<PA>],
    ReturnType<PA>['payload'],
    Type,
    ReturnType<PA> extends { error: infer E } ? E : never,
    TransitionMeta<Op> & (ReturnType<PA> extends { meta: infer M } ? M : object)
>;

export type TransitionPayloadAction<
    Type extends string,
    Op extends Operation,
    PA extends PrepareAction<any>,
> = PayloadAction<
    ReturnType<PA>['payload'],
    Type,
    TransitionMeta<Op> & (ReturnType<PA> extends { meta: infer M } ? M : object),
    ReturnType<PA> extends { error: infer E } ? E : never
>;

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

/** This function creates a transition action creator by extending RTK's `createAction`
 * utility. Due to limitations with the type inference of `PrepareAction`, a type cast
 * is required, as we cannot handle all variadic cases of the parameters of the `prepare`
 * function. This arises due to the specific requirements of `createTransition` which
 * necessitates passing a `transitionId` followed by parameters inferred from `PrepareAction`.
 * In contrast, the `PrepareAction` type is defined to accept any number of arguments of
 * any type. */
export const createTransition =
    <Type extends TransitionNamespace, Op extends Operation>(
        type: Type,
        operation: Op,
        dedupe: DedupeMode = DedupeMode.OVERWRITE,
    ) =>
    <PA extends PrepareAction<any>>(prepare: PA): TransitionWithPreparedPayload<Type, Op, PA> =>
        createAction(type, ((transitionId: string, ...params: Parameters<PA>) =>
            prepareTransition(prepare(...params), {
                id: transitionId,
                operation,
                dedupe,
            })) as PrepareAction<any>);

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
        const emptyPA = () => ({ payload: {} });

        const errorPA = (error: unknown) => ({
            error: error instanceof Error ? error.message : error,
            payload: {},
        });

        const stagePA = noOptions ? options : options.stage;
        const commitPA = noOptions ? emptyPA : options.commit ?? emptyPA;
        const failPA = noOptions ? errorPA : options.fail ?? errorPA;
        const stashPA = noOptions ? emptyPA : options.stash ?? emptyPA;

        return {
            amend: createTransition(`${type}::amend`, Operation.AMEND, dedupe)(stagePA),
            stage: createTransition(`${type}::stage`, Operation.STAGE, dedupe)(stagePA),
            commit: createTransition(`${type}::commit`, Operation.COMMIT, dedupe)(commitPA),
            fail: createTransition(`${type}::fail`, Operation.FAIL, dedupe)(failPA),
            stash: createTransition(`${type}::stash`, Operation.STASH, dedupe)(stashPA),
            match: createCommitMatcher<Type, PA_Stage>(type),
        };
    };
