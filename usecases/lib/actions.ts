import { createTransitions } from '../../src/actions';
import type { Todo } from './types';

export const createTodo = createTransitions('todos::add', (todo: Todo) => ({ payload: { todo } }));

export const editTodo = createTransitions('todos::edit', (id: string, update: Partial<Todo>) => ({
    payload: { id, update },
}));

export const deleteTodo = createTransitions('todos::delete', (id: string) => ({ payload: { id } }));
