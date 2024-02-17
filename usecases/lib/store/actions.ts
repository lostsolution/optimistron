import { createAction } from '@reduxjs/toolkit';
import { createTransitions } from '~actions';
import { DedupeMode } from '~transitions';
import type { Todo } from '~usecases/lib/store/types';

const create = (todo: Todo) => ({ payload: { todo } });
const edit = (id: string, todo: Todo) => ({ payload: { id, todo } });
const remove = (id: string) => ({ payload: { id } });

export const createTodo = createTransitions('todos::add')(create);
export const editTodo = createTransitions('todos::edit')(edit);
export const deleteTodo = createTransitions('todos::delete', DedupeMode.TRAILING)(remove);

export type OptimisticActions =
    | ReturnType<typeof createTodo.stage>
    | ReturnType<typeof editTodo.stage>
    | ReturnType<typeof deleteTodo.stage>;

export const sync = createAction('todos::sync');
