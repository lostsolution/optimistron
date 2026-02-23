import { createSelector } from '@reduxjs/toolkit';
import {
    selectFailedTransition,
    selectFailedTransitions,
    selectIsConflicting,
    selectIsFailed,
    selectIsOptimistic,
} from '~selectors/selectors';
import { selectOptimistic } from '~usecases/lib/store/epics/reducer';
import type { State } from '~usecases/lib/store/store';

export const selectEpic = (id: string) =>
    createSelector(
        (state: State) => state.epics,
        ({ state }) => state[id],
    );

export const selectOptimisticEpics = createSelector(
    (state: State) => state.epics,
    selectOptimistic((epics) => Object.values(epics.state).sort((a, b) => b.createdAt - a.createdAt)),
);

export const selectOptimisticEpicState = (id: string) =>
    createSelector(
        (state: State) => state.epics,
        (epics) => ({
            optimistic: selectIsOptimistic(id)(epics),
            failed: selectIsFailed(id)(epics),
            retry: selectFailedTransition(id)(epics),
            conflict: selectIsConflicting(id)(epics),
        }),
    );

/** Combined transitions from all reducers — feeds the transition graph */
export const selectAllTransitions = createSelector(
    (state: State) => state.epics.transitions,
    (state: State) => state.profile.transitions,
    (state: State) => state.projects.transitions,
    (state: State) => state.activity.transitions,
    (...lists) => lists.flat(),
);

/** All failed transitions across every slice — used for auto-retry */
export const selectAllFailedTransitions = createSelector(
    (state: State) => state.epics,
    (state: State) => state.profile,
    (state: State) => state.projects,
    (state: State) => state.activity,
    (epics, profile, projects, activity) => [
        ...selectFailedTransitions(epics),
        ...selectFailedTransitions(profile),
        ...selectFailedTransitions(projects),
        ...selectFailedTransitions(activity),
    ],
);
