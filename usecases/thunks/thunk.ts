import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';

import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';
import type { State } from '~usecases/lib/store/store';
import type { Todo } from '~usecases/lib/store/types';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

export const createTodoThunk = (todo: Todo): ThunkAction<void, State, undefined, AnyAction> => {
    return async (dispatch) => {
        const transitionId = todo.id;

        try {
            dispatch(createTodo.stage(transitionId, todo));
            await simulateAPIRequest();
            dispatch(createTodo.amend(transitionId, { ...todo, id: generateId() }));
            dispatch(createTodo.commit(transitionId));
        } catch (error) {
            dispatch(createTodo.fail(transitionId, error));
        }
    };
};

export const editTodoThunk = (id: string, update: Todo): ThunkAction<void, State, undefined, AnyAction> => {
    return async (dispatch) => {
        const transitionId = id;

        try {
            dispatch(editTodo.stage(transitionId, id, update));
            await simulateAPIRequest();
            dispatch(editTodo.commit(transitionId));
        } catch (error) {
            dispatch(editTodo.fail(transitionId, error));
        }
    };
};

export const deleteTodoTunk = (id: string): ThunkAction<void, State, undefined, AnyAction> => {
    return async (dispatch) => {
        const transitionId = id;

        try {
            dispatch(deleteTodo.stage(transitionId, id));
            await simulateAPIRequest();
            dispatch(deleteTodo.commit(transitionId));
        } catch {
            dispatch(deleteTodo.stash(transitionId));
        }
    };
};
