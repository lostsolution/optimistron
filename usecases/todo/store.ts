import { createSelector } from '@reduxjs/toolkit';
import { combineReducers, createStore } from 'redux';
import { createTransitions } from '../../src/actions';
import { optimistron } from '../../src/optimistron';
import { selectFailedAction, selectIsFailed, selectIsOptimistic, selectOptimistic } from '../../src/selectors';
import { recordHandlerFactory } from '../../src/state/record';

export type Todo = { id: string; value: string; revision: number; done: boolean };
export type TodoState = Record<string, Todo>;
export type State = ReturnType<typeof store.getState>;
const initial: TodoState = {};

export const createTodo = createTransitions('todos::add', (todo: Todo) => ({ payload: { todo } }));
export const editTodo = createTransitions('todos::edit', (id: string, update: Partial<Todo>) => ({
    payload: { id, update },
}));
export const deleteTodo = createTransitions('todos::edit', (id: string) => ({ payload: { id } }));

export const selectOptimisticTodos = createSelector(
    (state: State) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);

export const selectOptimisticTodoState = (id: string) =>
    createSelector(
        (state: State) => state.todos,
        (todos) => ({
            optimistic: selectIsOptimistic(id)(todos),
            failed: selectIsFailed(id)(todos),
            retry: selectFailedAction(id)(todos),
        }),
    );

export const todos = optimistron(
    'todos',
    initial,
    recordHandlerFactory<Todo>('id', (existing, incoming) => incoming.revision > existing.revision),
    ({ getState, create, update, remove }, action) => {
        if (createTodo.match(action)) return create(action.payload.todo);
        if (editTodo.match(action)) return update(action.payload.id, action.payload.update);
        if (deleteTodo.match(action)) return remove(action.payload.id);
        return getState();
    },
);

export const store = createStore(combineReducers({ todos }));
