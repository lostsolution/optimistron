import { createSelector } from '@reduxjs/toolkit';
import {
    selectFailedTransition,
    selectFailedTransitions,
    selectIsConflicting,
    selectIsFailed,
    selectIsOptimistic,
    selectOptimistic,
} from '~selectors';
import type { State } from '~usecases/lib/store/store';

export const selectTodo = (id: string) =>
    createSelector(
        (state: State) => state.todos,
        ({ state }) => state[id],
    );

export const selectOptimisticTodos = createSelector(
    (state: State) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state).sort((a, b) => b.createdAt - a.createdAt)),
);

export const selectOptimisticTodoState = (id: string) =>
    createSelector(
        (state: State) => state.todos,
        (todos) => ({
            optimistic: selectIsOptimistic(id)(todos),
            failed: selectIsFailed(id)(todos),
            retry: selectFailedTransition(id)(todos),
            conflict: selectIsConflicting(id)(todos),
        }),
    );

export const selectFailedTodos = createSelector(
    (state: State) => state.todos,
    (todos) => selectFailedTransitions(todos),
);

export const selectTransitions = createSelector(
    (state: State) => state.todos,
    (todos) => todos.transitions,
);
