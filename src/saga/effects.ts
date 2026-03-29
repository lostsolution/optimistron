import { call, put, takeEvery } from 'redux-saga/effects';

import { getTransitionMeta, TransitionMode } from '../core/transitions';
import type { StagedAction } from '../core/transitions';
import type { TransitionActions, TransitionSagaOptions } from './types';

/** Inner generator that orchestrates a single transition lifecycle.
 * Calls the effect, optionally amends, then commits or fails/stashes
 * based on the `TransitionMode` already declared on the transition meta. */
export const processTransition = <P, R>(
    actions: TransitionActions<P>,
    effect: (payload: P, action: StagedAction<P>) => R,
    options?: TransitionSagaOptions<P, R>,
) =>
    function* (action: StagedAction<P>) {
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

/** Creates a watcher saga that listens for staged transition actions
 * and orchestrates the API call → commit/fail lifecycle.
 *
 * ```ts
 * yield* watchTransition(createEpic, api.create, {
 *     amend: (payload, result) => ({ ...payload, id: result.id }),
 * });
 * yield* watchTransition(editEpic, api.update);
 * yield* watchTransition(deleteEpic, api.delete);
 * // stash-on-fail is automatic for REVERTIBLE transitions
 * ``` */
export function* watchTransition<P, R>(
    actions: TransitionActions<P>,
    effect: (payload: P, action: StagedAction<P>) => R,
    options?: TransitionSagaOptions<P, R>,
) {
    yield takeEvery(actions.stage.match, processTransition(actions, effect, options));
}
