import { createAction } from '@reduxjs/toolkit';
import { watchTransition, retryFailed } from '~saga/index';
import { activitySelectors } from '~usecases/lib/store/activity/reducer';
import { dismissActivity, editActivity, logActivity } from '~usecases/lib/store/activity/actions';
import { createEpic, deleteEpic, editEpic } from '~usecases/lib/store/epics/actions';
import { epicsSelectors } from '~usecases/lib/store/epics/reducer';
import { profileSelectors } from '~usecases/lib/store/profile/reducer';
import { updateProfile } from '~usecases/lib/store/profile/actions';
import { projectsSelectors } from '~usecases/lib/store/projects/reducer';
import { createProjectTodo, deleteProjectTodo, editProjectTodo } from '~usecases/lib/store/projects/actions';
import type { State } from '~usecases/lib/store/store';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

export const retryAll = createAction('optimistron::retryAll');

export function* rootSaga() {
    yield retryFailed(retryAll, (state: State) => [
        ...epicsSelectors.selectFailures(state.epics),
        ...profileSelectors.selectFailures(state.profile),
        ...projectsSelectors.selectFailures(state.projects),
        ...activitySelectors.selectFailures(state.activity),
    ]);

    yield watchTransition(createEpic, simulateAPIRequest, {
        amend: (payload) => ({ ...payload, id: generateId() }),
    });
    yield watchTransition(editEpic, simulateAPIRequest);
    yield watchTransition(deleteEpic, simulateAPIRequest);

    yield watchTransition(updateProfile, simulateAPIRequest);

    yield watchTransition(createProjectTodo, simulateAPIRequest, {
        amend: (payload) => ({ ...payload, id: generateId() }),
    });
    yield watchTransition(editProjectTodo, simulateAPIRequest);
    yield watchTransition(deleteProjectTodo, simulateAPIRequest);

    yield watchTransition(logActivity, simulateAPIRequest, {
        amend: (payload) => ({ ...payload, id: generateId() }),
    });
    yield watchTransition(editActivity, simulateAPIRequest);
    yield watchTransition(dismissActivity, simulateAPIRequest);
}
