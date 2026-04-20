import { call, put, select, takeEvery, takeLeading } from 'redux-saga/effects';
import type { Action } from '@reduxjs/toolkit';

import { getTransitionMeta, TransitionMode } from '../core/transitions';
import type { StagedAction } from '../core/transitions';
import type { InferPayload, TransitionActions } from '../core/actions/types';

export type TransitionSagaOptions<P, R = unknown> = {
    /** Transform before commit. Return value is passed to `amend()`.
     *  If omitted, commits directly without amending. */
    amend?: (payload: P, result: Awaited<R>) => P;
};

/** Inner generator that orchestrates a single transition lifecycle.
 * Calls the effect, optionally amends, then commits or fails/stashes
 * based on the `TransitionMode` already declared on the transition meta. */
export const handleTransition = <A extends TransitionActions, R>(
    actions: A,
    effect: (payload: InferPayload<A>, action: StagedAction<InferPayload<A>>) => R,
    options?: TransitionSagaOptions<InferPayload<A>, R>,
) =>
    function* (action: StagedAction<InferPayload<A>>) {
        const { id, mode } = getTransitionMeta(action);
        try {
            const result: Awaited<R> = yield call(effect, action.payload, action);
            if (options?.amend) yield put(actions.amend(id, options.amend(action.payload, result)));
            yield put(actions.commit(id));
        } catch (error) {
            if (mode === TransitionMode.REVERTIBLE) yield put(actions.stash(id));
            else yield put(actions.fail(id, error));
        }
    };

/** Returns a `takeEvery` effect that watches for staged transition
 * actions and orchestrates the API call → commit/fail lifecycle.
 *
 * ```ts
 * yield watchTransition(createEpic, api.create, {
 *     amend: (payload, result) => ({ ...payload, id: result.id }),
 * });
 * yield watchTransition(editEpic, api.update);
 * yield watchTransition(deleteEpic, api.delete);
 * // stash-on-fail is automatic for REVERTIBLE transitions
 * ``` */
export const watchTransition = <A extends TransitionActions, R>(
    actions: A,
    effect: (payload: InferPayload<A>, action: StagedAction<InferPayload<A>>) => R,
    options?: TransitionSagaOptions<InferPayload<A>, R>,
) => takeEvery(actions.stage.match, handleTransition(actions, effect, options));

/** Returns a `takeLeading` effect that retries all failed transitions
 * when the trigger action is dispatched.
 *
 * ```ts
 * const retryAll = createAction('optimistron::retryAll');
 *
 * yield retryFailed(retryAll, (state: RootState) => [
 *     ...epicsSelectors.selectFailures(state.epics),
 *     ...profileSelectors.selectFailures(state.profile),
 * ]);
 * ``` */
export const retryFailed = <RootState>(
    trigger: { match(action: Action): boolean },
    selectFailed: (state: RootState) => StagedAction[],
) =>
    takeLeading(trigger.match, function* () {
        const state: RootState = yield select();
        for (const action of selectFailed(state)) yield put(action);
    });
