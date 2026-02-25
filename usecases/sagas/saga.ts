import { createAction } from '@reduxjs/toolkit';
import { put, select, takeEvery, takeLeading } from 'redux-saga/effects';

import type { StagedAction } from '~transitions';
import { getTransitionMeta } from '~transitions';
import { activitySelectors } from '~usecases/lib/store/activity/reducer';
import { dismissActivity, editActivity, logActivity } from '~usecases/lib/store/activity/actions';
import { createEpic, deleteEpic, editEpic } from '~usecases/lib/store/epics/actions';
import { epicsSelectors } from '~usecases/lib/store/epics/reducer';
import { profileSelectors } from '~usecases/lib/store/profile/reducer';
import { updateProfile } from '~usecases/lib/store/profile/actions';
import { projectsSelectors } from '~usecases/lib/store/projects/reducer';
import { createProjectTodo, deleteProjectTodo, editProjectTodo } from '~usecases/lib/store/projects/actions';
import type { State } from '~usecases/lib/store/store';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

export const retryAll = createAction('optimistron::retryAll');

function* retryAllFailed() {
    const epics: State['epics'] = yield select((s: State) => s.epics);
    const profile: State['profile'] = yield select((s: State) => s.profile);
    const projects: State['projects'] = yield select((s: State) => s.projects);
    const activity: State['activity'] = yield select((s: State) => s.activity);

    const failed: StagedAction[] = [
        ...epicsSelectors.selectFailures(epics),
        ...profileSelectors.selectFailures(profile),
        ...projectsSelectors.selectFailures(projects),
        ...activitySelectors.selectFailures(activity),
    ];

    for (const action of failed) {
        yield put(action);
    }
}

export function* rootSaga() {
    yield takeLeading(retryAll.match, retryAllFailed);
    yield takeEvery(createEpic.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(createEpic.amend(transitionId, { ...action.payload, id: generateId() }));
            yield put(createEpic.commit(transitionId));
        } catch (error) {
            yield put(createEpic.fail(transitionId, error));
        }
    });

    yield takeEvery(editEpic.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(editEpic.commit(transitionId));
        } catch (error) {
            yield put(editEpic.fail(transitionId, error));
        }
    });

    yield takeEvery(deleteEpic.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(deleteEpic.commit(transitionId));
        } catch {
            yield put(deleteEpic.stash(transitionId));
        }
    });

    yield takeEvery(updateProfile.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(updateProfile.commit(transitionId));
        } catch (error) {
            yield put(updateProfile.fail(transitionId, error));
        }
    });

    yield takeEvery(createProjectTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(createProjectTodo.amend(transitionId, { ...action.payload, id: generateId() }));
            yield put(createProjectTodo.commit(transitionId));
        } catch (error) {
            yield put(createProjectTodo.fail(transitionId, error));
        }
    });

    yield takeEvery(editProjectTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(editProjectTodo.commit(transitionId));
        } catch (error) {
            yield put(editProjectTodo.fail(transitionId, error));
        }
    });

    yield takeEvery(deleteProjectTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(deleteProjectTodo.commit(transitionId));
        } catch {
            yield put(deleteProjectTodo.stash(transitionId));
        }
    });

    yield takeEvery(logActivity.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(logActivity.amend(transitionId, { ...action.payload, id: generateId() }));
            yield put(logActivity.commit(transitionId));
        } catch (error) {
            yield put(logActivity.fail(transitionId, error));
        }
    });

    yield takeEvery(editActivity.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(editActivity.commit(transitionId));
        } catch (error) {
            yield put(editActivity.fail(transitionId, error));
        }
    });

    yield takeEvery(dismissActivity.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(dismissActivity.commit(transitionId));
        } catch {
            yield put(dismissActivity.stash(transitionId));
        }
    });
}
