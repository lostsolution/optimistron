import type { ActionCreatorWithPreparedPayload, AnyAction, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';
import { MetaKey } from './constants';

export const OPTIMISTRON_INIT = { type: '__OPTIMISTRON_INIT__' };
export const EMPTY_PA = () => ({ payload: {} });

export enum TransitionOperation {
    STAGE,
    COMMIT,
    STASH,
    FAIL,
}

export type TransitionNamespace = `${string}::${string}`;
export type TransitionAction<A extends AnyAction = AnyAction> = A & { meta: { [MetaKey]: TransitionMeta } };
export type TransitionMeta = { id: string; operation: TransitionOperation; conflict: boolean; failed: boolean };

/* Extracts the transition meta definitions on an action */
export const getTransitionMeta = (action: TransitionAction) => action.meta[MetaKey];

/* Hydrates an action's transition meta definition */
export const withTransitionMeta = <PA extends ReturnType<PrepareAction<any>>>(action: PA, options: TransitionMeta) => ({
    ...action,
    meta: {
        ...('meta' in action ? action.meta : {}),
        [MetaKey]: options,
    },
});

/* checks if an action is a transition for the supplied namespace */
export const isTransitionForNamespace = (action: AnyAction, namespace: string): action is TransitionAction =>
    action?.meta && MetaKey in action?.meta && action.type.startsWith(`${namespace}::`);

/* updates the transition meta of a transition action */
export const updateTransition = (action: TransitionAction, update: Partial<TransitionMeta>): TransitionAction => ({
    ...action,
    meta: {
        ...action.meta,
        [MetaKey]: {
            ...action.meta[MetaKey],
            ...update,
        },
    },
});

/* helper action matcher function that will match the supplied
 * namespace when the transition operation is of type COMMIT */
const createTransitionMatcher =
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
) =>
    createAction(type, (transitionId, ...params) =>
        withTransitionMeta(prepare(...params), {
            conflict: false,
            failed: false,
            id: transitionId,
            operation,
        }),
    ) as ActionCreatorWithPreparedPayload<[transitionId: string, ...P], A['payload'], T, E, M>;

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
    const stagePA = noOptions ? options : options.stage;
    const commitPA = noOptions ? options : options.commit ?? options.stage;
    const failPA = noOptions ? EMPTY_PA : options.fail ?? EMPTY_PA;
    const stashPA = noOptions ? EMPTY_PA : options.stash ?? EMPTY_PA;

    return {
        stage: createTransition(`${type}::stage`, TransitionOperation.STAGE, stagePA),
        commit: createTransition(`${type}::commit`, TransitionOperation.COMMIT, commitPA),
        fail: createTransition(`${type}::fail`, TransitionOperation.FAIL, failPA),
        stash: createTransition(`${type}::stash`, TransitionOperation.STASH, stashPA),
        match: createTransitionMatcher<ActionType, PA_Commit>(type),
    };
};
