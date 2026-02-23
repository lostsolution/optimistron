import type { Action } from 'redux';
import type { ThunkAction } from 'redux-thunk';

import { dismissActivity, editActivity, logActivity } from '~usecases/lib/store/activity/actions';
import { createEpic, deleteEpic, editEpic } from '~usecases/lib/store/epics/actions';
import { updateProfile } from '~usecases/lib/store/profile/actions';
import { createProjectTodo, deleteProjectTodo, editProjectTodo } from '~usecases/lib/store/projects/actions';
import type { State } from '~usecases/lib/store/store';
import type { ActivityEntry, Epic, Profile, ProjectTodo } from '~usecases/lib/store/types';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

type Thunk = ThunkAction<void, State, undefined, Action>;

export const createEpicThunk = (epic: Epic): Thunk => async (dispatch) => {
    const transitionId = epic.id;
    try {
        dispatch(createEpic.stage(epic));
        await simulateAPIRequest();
        dispatch(createEpic.amend(transitionId, { ...epic, id: generateId() }));
        dispatch(createEpic.commit(transitionId));
    } catch (error) {
        dispatch(createEpic.fail(transitionId, error));
    }
};

export const editEpicThunk = (id: string, update: Epic): Thunk => async (dispatch) => {
    const transitionId = id;
    try {
        dispatch(editEpic.stage(id, update));
        await simulateAPIRequest();
        dispatch(editEpic.commit(transitionId));
    } catch (error) {
        dispatch(editEpic.fail(transitionId, error));
    }
};

export const deleteEpicThunk = (id: string): Thunk => async (dispatch) => {
    const transitionId = id;
    try {
        dispatch(deleteEpic.stage(id));
        await simulateAPIRequest();
        dispatch(deleteEpic.commit(transitionId));
    } catch {
        dispatch(deleteEpic.stash(transitionId));
    }
};

export const updateProfileThunk = (update: Partial<Profile>): Thunk => async (dispatch) => {
    try {
        dispatch(updateProfile.stage(update));
        await simulateAPIRequest();
        dispatch(updateProfile.commit('profile'));
    } catch (error) {
        dispatch(updateProfile.fail('profile', error));
    }
};

export const createProjectTodoThunk = (todo: ProjectTodo): Thunk => async (dispatch) => {
    const transitionId = `${todo.projectId}/${todo.id}`;
    try {
        dispatch(createProjectTodo.stage(todo));
        await simulateAPIRequest();
        dispatch(createProjectTodo.amend(transitionId, { ...todo, id: generateId() }));
        dispatch(createProjectTodo.commit(transitionId));
    } catch (error) {
        dispatch(createProjectTodo.fail(transitionId, error));
    }
};

export const editProjectTodoThunk = (todo: ProjectTodo): Thunk => async (dispatch) => {
    const transitionId = `${todo.projectId}/${todo.id}`;
    try {
        dispatch(editProjectTodo.stage(todo.projectId, todo.id, todo));
        await simulateAPIRequest();
        dispatch(editProjectTodo.commit(transitionId));
    } catch (error) {
        dispatch(editProjectTodo.fail(transitionId, error));
    }
};

export const deleteProjectTodoThunk = (todo: ProjectTodo): Thunk => async (dispatch) => {
    const transitionId = `${todo.projectId}/${todo.id}`;
    try {
        dispatch(deleteProjectTodo.stage(todo.projectId, todo.id));
        await simulateAPIRequest();
        dispatch(deleteProjectTodo.commit(transitionId));
    } catch {
        dispatch(deleteProjectTodo.stash(transitionId));
    }
};

export const logActivityThunk = (entry: ActivityEntry): Thunk => async (dispatch) => {
    const transitionId = entry.id;
    try {
        dispatch(logActivity.stage(entry));
        await simulateAPIRequest();
        dispatch(logActivity.amend(transitionId, { ...entry, id: generateId() }));
        dispatch(logActivity.commit(transitionId));
    } catch (error) {
        dispatch(logActivity.fail(transitionId, error));
    }
};

export const editActivityThunk = (entry: ActivityEntry): Thunk => async (dispatch) => {
    const transitionId = entry.id;
    try {
        dispatch(editActivity.stage(entry.id, entry));
        await simulateAPIRequest();
        dispatch(editActivity.commit(transitionId));
    } catch (error) {
        dispatch(editActivity.fail(transitionId, error));
    }
};

export const dismissActivityThunk = (entry: ActivityEntry): Thunk => async (dispatch) => {
    const transitionId = entry.id;
    try {
        dispatch(dismissActivity.stage(entry.id));
        await simulateAPIRequest();
        dispatch(dismissActivity.commit(transitionId));
    } catch {
        dispatch(dismissActivity.stash(transitionId));
    }
};
