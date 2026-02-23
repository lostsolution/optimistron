import { createTransitions, crudPrepare } from '~actions';
import { DedupeMode } from '~transitions';
import type { ActivityEntry } from '~usecases/lib/store/types';

const crud = crudPrepare<ActivityEntry>('id');

export const logActivity = createTransitions('activity::add')(crud.create);
export const editActivity = createTransitions('activity::edit')(crud.update);
export const dismissActivity = createTransitions('activity::dismiss', DedupeMode.TRAILING)(crud.remove);
