import { put, takeEvery } from 'redux-saga/effects';

import { getTransitionMeta } from '~transitions';
import { dismissActivity, editActivity, logActivity } from '~usecases/lib/store/activity/actions';
import { createEpic, deleteEpic, editEpic } from '~usecases/lib/store/epics/actions';
import { updateProfile } from '~usecases/lib/store/profile/actions';
import { createProjectTodo, deleteProjectTodo, editProjectTodo } from '~usecases/lib/store/projects/actions';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

export function* rootSaga() {
    yield takeEvery(createEpic.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        try {
            yield simulateAPIRequest();
            yield put(createEpic.amend(transitionId, { ...action.payload.item, id: generateId() }));
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
            yield put(createProjectTodo.amend(transitionId, { ...action.payload.item, id: generateId() }));
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
            yield put(logActivity.amend(transitionId, { ...action.payload.item, id: generateId() }));
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
