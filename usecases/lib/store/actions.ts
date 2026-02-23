import { createAction } from '@reduxjs/toolkit';
import { crudPrepare } from '~actions/crud';
import { createTransitions } from '~actions';
import { DedupeMode } from '~transitions';
import type { Todo } from '~usecases/lib/store/types';

const crud = crudPrepare<Todo>('id');

export const createTodo = createTransitions('todos::add')(crud.create);
export const editTodo = createTransitions('todos::edit')(crud.update);
export const deleteTodo = createTransitions('todos::delete', DedupeMode.TRAILING)(crud.remove);

export type OptimisticActions =
    | ReturnType<typeof createTodo.stage>
    | ReturnType<typeof editTodo.stage>
    | ReturnType<typeof deleteTodo.stage>;

export const sync = createAction('todos::sync');
