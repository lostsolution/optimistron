import type { AnyAction } from 'redux';
import { OptimisticMetaKey, OptimisticRefIdKey } from './constants';
import type { BoundStateHandler } from './state';

export enum OptimisticOperation {
    STAGE,
    COMMIT,
    STASH,
    FAIL,
}

export enum OptimisticMergeResult {
    SKIP,
    CONFLICT,
}

export type OptimisticId<A> = string | ((action: A) => string);

export type OptimisticMeta = {
    id: string;
    operation: OptimisticOperation;
    conflict: boolean;
    failed: boolean;
};

export type OptimisticAction<A extends AnyAction = AnyAction> = A & { meta: { [OptimisticMetaKey]: OptimisticMeta } };

export type OptimisticState<T> = { state: T; mutations: OptimisticAction[]; [OptimisticRefIdKey]: string };

export type BoundReducer<
    Action extends AnyAction,
    State,
    CreateParams extends any[],
    UpdateParams extends any[],
    DeleteParams extends any[],
> = (boundStateHandler: BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams>, action: Action) => State;
