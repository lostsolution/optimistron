import type { Action, ActionCreatorWithPreparedPayload, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import type { MetaKey } from '~constants';
import type { TransitionMeta, TransitionNamespace } from '~transitions';
import { DedupeMode, Operation, getTransitionMeta, isTransitionForNamespace, prepareTransition } from '~transitions';

type EmptyPayload = { payload: never };
type PA_Empty = () => EmptyPayload;
type PA_Error = (error: unknown) => EmptyPayload & { error: Error };

/** Helper action matcher function that will match the supplied
 * namespace when the transition operation is of type COMMIT */
const createMatcher =
    <NS extends string, PA extends PrepareAction<any>>(namespace: NS) =>
    <
        Result extends ReturnType<PA>,
        Error = Result extends { error: infer Err } ? Err : never,
        Meta = { [MetaKey]: TransitionMeta } & (Result extends { meta: infer Meta } ? Meta : object),
    >(
        action: Action,
    ): action is PayloadAction<Result['payload'], NS, Meta, Error> =>
        isTransitionForNamespace(action, namespace) && getTransitionMeta(action).operation === Operation.COMMIT;

const createTransition =
    <Type extends TransitionNamespace, Op extends Operation>(
        type: Type,
        operation: Op,
        dedupe: DedupeMode = DedupeMode.OVERWRITE,
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
            prepareTransition(prepare(...params), {
                id: transitionId,
                operation,
                dedupe,
            }),
        );

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
            commit: createTransition(`${type}::commit`, Operation.COMMIT, dedupe)(commitPA as PA_Commit),
            fail: createTransition(`${type}::fail`, Operation.FAIL, dedupe)(failPA as PA_Fail),
            stash: createTransition(`${type}::stash`, Operation.STASH, dedupe)(stashPA as PA_Stash),
            match: createMatcher<Type, PA_Stage>(type),
        };
    };
