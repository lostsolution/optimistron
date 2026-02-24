import { createSelector } from '@reduxjs/toolkit';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic } from '~selectors/selectors';
import { selectOptimistic } from '~usecases/lib/store/projects/reducer';
import type { State } from '~usecases/lib/store/store';
import type { ProjectTodo } from '~usecases/lib/store/types';

export const selectOptimisticProjectTodos = (projectId: string) =>
    createSelector(
        (state: State) => state.projects,
        selectOptimistic((projects): ProjectTodo[] => {
            const group = projects.state[projectId];
            return group ? Object.values(group).sort((a, b) => b.createdAt - a.createdAt) : [];
        }),
    );

export const selectOptimisticProjectTodoState = (projectId: string, todoId: string) => {
    const transitionId = `${projectId}/${todoId}`;
    return createSelector(
        (state: State) => state.projects,
        (projects) => ({
            optimistic: selectIsOptimistic(transitionId)(projects),
            failed: selectIsFailed(transitionId)(projects),
            conflict: selectIsConflicting(transitionId)(projects),
        }),
    );
};
