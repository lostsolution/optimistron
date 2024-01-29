import { put, takeEvery } from 'redux-saga/effects';

import { getTransitionMeta } from '~transitions';
import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

export function* rootSaga() {
    yield takeEvery(createTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;

        try {
            yield simulateAPIRequest();
            yield put(createTodo.amend(transitionId, { ...action.payload.todo, id: generateId() }));
            yield put(createTodo.commit(transitionId));
        } catch (error) {
            yield put(createTodo.fail(transitionId, error));
        }
    });

    yield takeEvery(editTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;
        console.log('** starting saga');

        try {
            yield simulateAPIRequest();
            yield put(editTodo.commit(transitionId));
        } catch (error) {
            yield put(editTodo.fail(transitionId, error));
        }
    });

    yield takeEvery(deleteTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;

        try {
            yield simulateAPIRequest();
            yield put(deleteTodo.commit(transitionId));
        } catch {
            yield put(deleteTodo.stash(transitionId));
        }
    });
}
