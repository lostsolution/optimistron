import { createTransitions, crudPrepare } from '~actions';
import { DedupeMode } from '~transitions';
import type { ProjectTodo } from '~usecases/lib/store/types';

const crud = crudPrepare<ProjectTodo>()(['projectId', 'id']);

export const createProjectTodo = createTransitions('projects::add')(crud.create);
export const editProjectTodo = createTransitions('projects::edit')(crud.update);
export const deleteProjectTodo = createTransitions('projects::delete', DedupeMode.TRAILING)(crud.remove);
