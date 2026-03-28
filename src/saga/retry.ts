import { put, select } from 'redux-saga/effects';

import type { StagedAction } from '../core/transitions';
import type { TransitionState } from '../core/state/types';

type FailureSelector = {
    selectFailures: (state: TransitionState<any>) => StagedAction[];
};

/** Creates a retry saga that collects failed transitions across
 * multiple slices and re-dispatches them as fresh stage actions.
 *
 * ```ts
 * const retry = retryFailed(
 *     (state: RootState) => [state.epics, state.profile],
 *     [epicsSelectors, profileSelectors],
 * );
 * yield takeLeading(retryAll.match, retry);
 * ``` */
export const retryFailed =
    <RootState>(selectSlices: (state: RootState) => TransitionState<any>[], selectors: FailureSelector[]) =>
    function* () {
        const state: RootState = yield select();
        const slices = selectSlices(state);
        const failed = slices.flatMap((slice, i) => selectors[i].selectFailures(slice));
        for (const action of failed) yield put(action);
    };
