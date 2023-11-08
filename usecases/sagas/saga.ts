import { put, takeEvery } from 'redux-saga/effects';
import { getTransitionMeta } from '../../src/actions';
import { createTodo, deleteTodo, editTodo } from '../lib/actions';
import { generateId, simulateAPIRequest } from '../lib/utils';

export function* rootSaga() {
    yield takeEvery(createTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;

        try {
            const createdTodo = { ...action.payload.todo, id: generateId() };
            yield simulateAPIRequest(0.5);
            yield put(createTodo.commit(transitionId, createdTodo));
        } catch (e) {
            yield put(createTodo.fail(transitionId));
        }
    });

    yield takeEvery(editTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;

        try {
            yield simulateAPIRequest(0.3);
            yield put(editTodo.commit(transitionId, action.payload.id, action.payload.update));
        } catch (e) {
            yield put(editTodo.fail(transitionId));
        }
    });

    yield takeEvery(deleteTodo.stage.match, function* (action) {
        const transitionId = getTransitionMeta(action).id;

        try {
            yield simulateAPIRequest(0.3);
            yield put(deleteTodo.commit(transitionId, action.payload.id));
        } catch (e) {
            alert('deleting todo failed');
            yield put(deleteTodo.stash(transitionId));
        }
    });
}
