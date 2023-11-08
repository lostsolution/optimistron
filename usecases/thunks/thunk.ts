import { AnyAction, ThunkAction, combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import { createTodo, deleteTodo, editTodo } from '../lib/actions';
import { State } from '../lib/store';
import { Todo } from '../lib/types';
import { generateId, simulateAPIRequest } from '../lib/utils';

import { TransitionAction } from '../../src/actions';
import { todos } from '../lib/reducer';

export const thunkStore = configureStore({ reducer: combineReducers({ todos }) });
export type ThunkDispatch = typeof thunkStore.dispatch;
export const useThunkDispatch: () => ThunkDispatch = useDispatch;

export const createTodoThunk = (todo: Todo): ThunkAction<void, State, undefined, AnyAction> => {
    return async (dispatch) => {
        const transitionId = todo.id;

        try {
            dispatch(createTodo.stage(transitionId, todo));
            const createdTodo = { ...todo, id: generateId() };
            await simulateAPIRequest(0.5);
            dispatch(createTodo.commit(transitionId, createdTodo));
        } catch (e) {
            dispatch(createTodo.fail(transitionId));
        }
    };
};

export const editTodoThunk = (id: string, update: Partial<Todo>): ThunkAction<void, State, undefined, AnyAction> => {
    return async (dispatch) => {
        const transitionId = id;

        try {
            dispatch(editTodo.stage(transitionId, id, update));
            await simulateAPIRequest(0.5);
            dispatch(editTodo.commit(transitionId, id, update));
        } catch (e) {
            dispatch(editTodo.fail(transitionId));
        }
    };
};

export const removeTodoThunk = (id: string): ThunkAction<void, State, undefined, AnyAction> => {
    return async (dispatch) => {
        const transitionId = id;

        try {
            dispatch(deleteTodo.stage(transitionId, id));
            await simulateAPIRequest(0.5);
            dispatch(deleteTodo.commit(transitionId, id));
        } catch (e) {
            alert('deleting todo failed');
            dispatch(deleteTodo.stash(transitionId));
        }
    };
};

export const retryTransitionThunk = (retry: TransitionAction): ThunkAction<void, State, undefined, AnyAction> => {
    return async (dispatch) => {
        if (createTodo.stage.match(retry)) dispatch(createTodoThunk(retry.payload.todo));
        if (editTodo.stage.match(retry)) dispatch(editTodoThunk(retry.payload.id, retry.payload.update));
    };
};
