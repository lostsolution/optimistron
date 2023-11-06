import { createSelector } from '@reduxjs/toolkit';
import { selectFailedAction, selectIsFailed, selectIsOptimistic, selectOptimistic } from '../../src/selectors';
import { type State } from './store';

export const selectOptimisticTodos = createSelector(
    (state: State) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);

export const selectOptimisticTodoState = (id: string) =>
    createSelector(
        (state: State) => state.todos,
        (todos) => ({
            optimistic: selectIsOptimistic(id)(todos),
            failed: selectIsFailed(id)(todos),
            retry: selectFailedAction(id)(todos),
        }),
    );
