import { createSelector } from '@reduxjs/toolkit';
import { combineReducers, createStore } from 'redux';
import { createOptimisticActions } from '../../src/actions';
import { optimistron } from '../../src/optimistron';
import { selectOptimistic } from '../../src/selectors';
import { entryStateHandlerFactory } from '../../src/state/record';

export type Todo = { id: string; value: string; revision: number };
export type TodoState = Record<string, Todo>;
export type State = ReturnType<typeof store.getState>;
const initial: TodoState = {};

export const createTodo = createOptimisticActions('todos::add', { stage: (todo: Todo) => ({ payload: { todo } }) });

export const selectOptimisticTodos = createSelector(
    (state: State) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);

export const todos = optimistron(
    'todos',
    initial,
    entryStateHandlerFactory<Todo>('id', (existing, incoming) => incoming.revision > existing.revision),
    ({ getState, create }, action) => {
        if (createTodo.match(action)) return create(action.payload.todo);
        return getState();
    },
);

export const store = createStore(combineReducers({ todos }));
