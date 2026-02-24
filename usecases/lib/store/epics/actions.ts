import { createAction } from '@reduxjs/toolkit';
import { createTransitions, crudPrepare } from '~actions';
import { TransitionMode } from '~transitions';
import type { Epic } from '~usecases/lib/store/types';

const crud = crudPrepare<Epic>('id');

export const createEpic = createTransitions('epics::add')(crud.create);
export const editEpic = createTransitions('epics::edit')(crud.update);
export const deleteEpic = createTransitions('epics::delete', TransitionMode.REVERTIBLE)(crud.remove);

export type OptimisticActions =
    | ReturnType<typeof createEpic.stage>
    | ReturnType<typeof editEpic.stage>
    | ReturnType<typeof deleteEpic.stage>;

export const sync = createAction('store::sync');
