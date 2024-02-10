import type { Action, ActionCreatorWithPreparedPayload, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import type { MetaKey } from '~constants';
import type { TransitionMeta, TransitionNamespace } from '~transitions';
import {
    TransitionDedupeMode,
    TransitionOperation,
    getTransitionMeta,
    isTransitionForNamespace,
    withTransitionMeta,
} from '~transitions';

/** Helper action matcher function that will match the supplied
 * namespace when the transition operation is of type COMMIT */
const createMatcher =
    <NS extends TransitionNamespace, PA extends PrepareAction<any>>(namespace: NS) =>
    <
        Result extends ReturnType<PA>,
        Error = Result extends { error: infer Err } ? Err : never,
        Meta = { [MetaKey]: TransitionMeta } & (Result extends { meta: infer Meta } ? Meta : object),
    >(
        action: Action,
    ): action is PayloadAction<Result['payload'], NS, Meta, Error> =>
        isTransitionForNamespace(action, namespace) &&
        getTransitionMeta(action).operation === TransitionOperation.COMMIT;

export const createTransition =
    <Type extends TransitionNamespace>(
        type: Type,
        operation: TransitionOperation,
        dedupe: TransitionDedupeMode = TransitionDedupeMode.OVERWRITE,
    ) =>
    <
        PA extends PrepareAction<any>,
        Action extends ReturnType<PA>,
        Params extends Parameters<PA>,
        Err = Action extends { error: infer E } ? E : never,
        Meta = { [MetaKey]: TransitionMeta } & (Action extends { meta: infer M } ? M : object),
    >(
        prepare: PA,
    ): ActionCreatorWithPreparedPayload<[transitionId: string, ...Params], Action['payload'], Type, Err, Meta> =>
        createAction(type, (transitionId, ...params) =>
            withTransitionMeta(prepare(...params), {
                conflict: false,
                failed: false,
                id: transitionId,
                operation,
                dedupe,
            }),
        );

type EmptyPayload = { payload: never };
type PA_Empty = () => EmptyPayload;
type PA_Error = (error: unknown) => EmptyPayload & { error: Error };

export const createTransitions =
    <Type extends TransitionNamespace>(type: Type, dedupe: TransitionDedupeMode = TransitionDedupeMode.OVERWRITE) =>
    <
        PA_Stage extends PrepareAction<any>,
        PA_Commit extends PA_Stage | PA_Empty = PA_Empty,
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
            amend: createTransition(`${type}::amend`, TransitionOperation.AMEND, dedupe)(stagePA),
            stage: createTransition(`${type}::stage`, TransitionOperation.STAGE, dedupe)(stagePA),
            commit: createTransition(`${type}::commit`, TransitionOperation.COMMIT, dedupe)(commitPA as PA_Commit),
            fail: createTransition(`${type}::fail`, TransitionOperation.FAIL, dedupe)(failPA as PA_Fail),
            stash: createTransition(`${type}::stash`, TransitionOperation.STASH, dedupe)(stashPA as PA_Stash),
            match: createMatcher<Type, PA_Stage>(type),
        };
    };
