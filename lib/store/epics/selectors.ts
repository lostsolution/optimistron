import { createSelector } from '@reduxjs/toolkit';
import { epicsSelectors } from '~usecases/lib/store/epics/reducer';
import type { State } from '~usecases/lib/store/store';

const { selectOptimistic, selectIsOptimistic, selectIsFailed, selectIsConflicting } = epicsSelectors;

export const selectEpic = (id: string) =>
    createSelector(
        (state: State) => state.epics,
        ({ committed }) => committed[id],
    );

export const selectOptimisticEpics = createSelector(
    (state: State) => state.epics,
    selectOptimistic((epics) => Object.values(epics.committed).sort((a, b) => b.createdAt - a.createdAt)),
);

export const selectOptimisticEpicState = (id: string) =>
    createSelector(
        (state: State) => state.epics,
        (epics) => ({
            optimistic: selectIsOptimistic(id)(epics),
            failed: selectIsFailed(id)(epics),
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
