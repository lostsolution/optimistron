import { optimistron } from '../../src/optimistron';
import { recordHandlerFactory } from '../../src/state/record';
import { createTodo, deleteTodo, editTodo } from './actions';
import type { Todo } from './types';

export const todos = optimistron(
    'todos',
    {},
    recordHandlerFactory<Todo>('id', (existing, incoming) => incoming.revision > existing.revision),
    ({ getState, create, update, remove }, action) => {
        if (createTodo.match(action)) return create(action.payload.todo);
        if (editTodo.match(action)) return update(action.payload.id, action.payload.update);
        if (deleteTodo.match(action)) return remove(action.payload.id);
        return getState();
    },
);
