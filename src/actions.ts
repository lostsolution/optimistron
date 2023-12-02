import type { ActionCreatorWithPreparedPayload, AnyAction, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';
import { MetaKey } from './constants';

export enum TransitionOperation {
    STAGE,
    COMMIT,
    STASH,
    FAIL,
}

export type TransitionNamespace = `${string}::${string}`;
export type TransitionAction<A = AnyAction> = A & { meta: { [MetaKey]: TransitionMeta } };
export type TransitionMeta = { id: string; operation: TransitionOperation; conflict: boolean; failed: boolean };

/** Extracts the transition meta definitions on an action */
export const getTransitionMeta = (action: TransitionAction) => action.meta[MetaKey];
export const getTransitionID = (action: TransitionAction) => action.meta[MetaKey].id;

/**  Hydrates an action's transition meta definition */
export const withTransitionMeta = (
    action: ReturnType<PrepareAction<any>>,
    options: TransitionMeta,
): TransitionAction<typeof action> => ({
    ...action,
    meta: {
        ...('meta' in action ? action.meta : {}),
        [MetaKey]: options,
    },
});

/** Checks wether an action is a transition for the supplied namespace */
export const isTransitionForNamespace = (
    action: AnyAction,
    namespace: string,
): action is TransitionAction<typeof action> =>
    action?.meta && MetaKey in action?.meta && action.type.startsWith(`${namespace}::`);

/** Updates the transition meta of a transition action */
export const updateTransition = <T>(
    action: TransitionAction<T>,
    update: Partial<TransitionMeta>,
): TransitionAction<T> => ({
    ...action,
    meta: {
        ...action.meta,
        [MetaKey]: {
            ...action.meta[MetaKey],
            ...update,
        },
    },
});

/** Helper action matcher function that will match the supplied
 * namespace when the transition operation is of type COMMIT */
const createCommitMatcher =
    <NS extends TransitionNamespace, PA extends PrepareAction<any>>(namespace: NS) =>
    <
        Result extends ReturnType<PA>,
        Error = Result extends { error: infer Err } ? Err : never,
        Meta = { [MetaKey]: TransitionMeta } & (Result extends { meta: infer Meta } ? Meta : {}),
    >(
        action: AnyAction,
    ): action is PayloadAction<Result['payload'], NS, Meta, Error> =>
        isTransitionForNamespace(action, namespace) &&
        getTransitionMeta(action).operation === TransitionOperation.COMMIT;

export const createTransition = <
    PA extends PrepareAction<any>,
    A extends ReturnType<PA>,
    P extends Parameters<PA>,
    T extends TransitionNamespace,
    E = A extends { error: infer E } ? E : never,
    M = { [MetaKey]: TransitionMeta } & (A extends { meta: infer M } ? M : {}),
>(
    type: T,
    operation: TransitionOperation,
    prepare: PA,
): ActionCreatorWithPreparedPayload<[transitionId: string, ...P], A['payload'], T, E, M> =>
    createAction(type, (transitionId, ...params) =>
        withTransitionMeta(prepare(...params), {
            conflict: false,
            failed: false,
            id: transitionId,
            operation,
        }),
    );

export const createTransitions = <
    ActionType extends `${string}::${string}`,
    PA_Stage extends PrepareAction<any>,
    PA_Commit extends PA_Stage,
    PA_Fail extends PrepareAction<any>,
    PA_Stash extends PrepareAction<any>,
>(
    type: ActionType,
    options:
        | PA_Stage
        | {
              stage: PA_Stage;
              stash?: PA_Stash;
              commit?: PA_Commit;
              fail?: PA_Fail;
          },
) => {
    const noOptions = typeof options === 'function';
    const empty = () => ({ payload: {} });

    const stagePA = noOptions ? options : options.stage;
    const commitPA = noOptions ? options : options.commit ?? options.stage;
    const failPA = noOptions ? empty : options.fail ?? empty;
    const stashPA = noOptions ? empty : options.stash ?? empty;

    return {
        stage: createTransition(`${type}::stage`, TransitionOperation.STAGE, stagePA),
        commit: createTransition(`${type}::commit`, TransitionOperation.COMMIT, commitPA),
        fail: createTransition(`${type}::fail`, TransitionOperation.FAIL, failPA),
        stash: createTransition(`${type}::stash`, TransitionOperation.STASH, stashPA),
        match: createCommitMatcher<ActionType, PA_Commit>(type),
    };
};
