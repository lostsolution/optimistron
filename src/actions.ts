import type { ActionCreatorWithPreparedPayload, AnyAction, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';
import { OptimisticMetaKey } from './constants';
export const OPTIMISTRON_INIT = { type: '__OPTIMISTRON_INIT__' };

export enum OptimisticOperation {
    STAGE,
    COMMIT,
    STASH,
    FAIL,
}

export type OptimisticId<A> = string | ((action: A) => string);
export type OptimisticAction<A extends AnyAction = AnyAction> = A & { meta: { [OptimisticMetaKey]: OptimisticMeta } };
export type OptimisticMeta = { id: string; operation: OptimisticOperation; conflict: boolean; failed: boolean };

export const actionMatchesNamespace = (action: OptimisticAction, namespace?: string) =>
    !namespace || action.type.startsWith(namespace);

export const resolveOptimisticId = <A>(action: A, id: OptimisticId<A>) => (typeof id === 'string' ? id : id(action));

export const getOptimisticMeta = (action: OptimisticAction) => action.meta[OptimisticMetaKey];

export const withOptimisticMeta = <PA extends ReturnType<PrepareAction<any>>>(action: PA, options: OptimisticMeta) => ({
    ...action,
    meta: {
        ...('meta' in action ? action.meta : {}),
        [OptimisticMetaKey]: options,
    },
});

export const isOptimisticActionForNamespace = (action: AnyAction, namespace: string): action is OptimisticAction =>
    action?.meta && OptimisticMetaKey in action?.meta && action.type.startsWith(`${namespace}::`);

export const createOptimisticAction = <
    PA extends PrepareAction<any>,
    A extends ReturnType<PA>,
    P extends Parameters<PA>,
    T extends `${string}::${string}`,
    E = A extends { error: infer E } ? E : never,
    M = { [OptimisticMetaKey]: OptimisticMeta } & (A extends { meta: infer M } ? M : {}),
>(
    type: T,
    operation: OptimisticOperation,
    prepare: PA,
) =>
    createAction(type, (optimisticId, ...params) =>
        withOptimisticMeta(prepare(...params), {
            conflict: false,
            failed: false,
            id: optimisticId,
            operation,
        }),
    ) as ActionCreatorWithPreparedPayload<[optimisticId: string, ...P], A['payload'], T, E, M>;

const createOptimisticActionMatcher =
    <ActionType extends `${string}::${string}`, PA extends PrepareAction<any>>(type: ActionType) =>
    <
        Result extends ReturnType<PA>,
        Error = Result extends { error: infer Err } ? Err : never,
        Meta = { [OptimisticMetaKey]: OptimisticMeta } & (Result extends { meta: infer Meta } ? Meta : {}),
    >(
        action: AnyAction,
    ): action is PayloadAction<Result['payload'], ActionType, Meta, Error> =>
        action.type === `${type}::commit` ||
        (action.type === `${type}::stage` &&
            (action as any).meta[OptimisticMetaKey].operation === OptimisticOperation.COMMIT);

const emptyActionPreparator = () => ({ payload: {} });

export const createOptimisticActions = <
    ActionType extends `${string}::${string}`,
    PA_Stage extends PrepareAction<any>,
    PA_Commit extends PA_Stage,
    PA_Fail extends PrepareAction<any>,
    PA_Stash extends PrepareAction<any>,
>(
    type: ActionType,
    options: {
        stage: PA_Stage;
        stash?: PA_Stash;
        commit?: PA_Commit;
        fail?: PA_Fail;
    },
) => ({
    stage: createOptimisticAction(`${type}::stage`, OptimisticOperation.STAGE, options.stage),
    commit: createOptimisticAction(`${type}::commit`, OptimisticOperation.COMMIT, options.commit ?? options.stage),
    fail: createOptimisticAction(`${type}::fail`, OptimisticOperation.FAIL, options.fail ?? emptyActionPreparator),
    stash: createOptimisticAction(`${type}::stash`, OptimisticOperation.STASH, options.stash ?? emptyActionPreparator),
    match: createOptimisticActionMatcher<ActionType, PA_Commit>(type),
});

export const updateAction = (action: OptimisticAction, update: Partial<OptimisticMeta>): OptimisticAction => ({
    ...action,
    meta: {
        ...action.meta,
        [OptimisticMetaKey]: {
            ...action.meta[OptimisticMetaKey],
            ...update,
        },
    },
});
