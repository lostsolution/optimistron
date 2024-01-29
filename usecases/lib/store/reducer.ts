import { optimistron } from '~optimistron';
import { recordHandlerFactory } from '~state/record';

import { createTodo, deleteTodo, editTodo, sync } from '~usecases/lib/store/actions';
import type { Todo } from '~usecases/lib/store/types';
import { generateId } from '~usecases/lib/utils/mock-api';

const initial = (() => {
    const createdAt = Date.now();
    const todo1: Todo = { id: generateId(), value: 'Try out optimistron', revision: 0, done: true, createdAt };
    const todo2: Todo = { id: generateId(), value: 'Toggle API Mock', revision: 42, done: false, createdAt };
    const todo3: Todo = { id: generateId(), value: 'Add a new todo', revision: 2, done: true, createdAt };

    return {
        [todo1.id]: todo1,
        [todo2.id]: todo2,
        [todo3.id]: todo3,
    };
})();

const compare = (a: Todo) => (b: Todo) => {
    if (a.revision === b.revision) return 0;
    if (a.revision > b.revision) return 1;
    return -1;
};

const eq = (a: Todo) => (b: Todo) => a.done === b.done && a.value === b.value;

export const todos = optimistron(
    'todos',
    initial,
    recordHandlerFactory<Todo>({ itemIdKey: 'id', compare, eq }),
    ({ getState, create, update, remove }, action) => {
        if (createTodo.match(action)) return create(action.payload.todo);
        if (editTodo.match(action)) return update(action.payload.id, action.payload.todo);
        if (deleteTodo.match(action)) return remove(action.payload.id);

        if (sync.match(action)) {
            /** Simulate items all being bumped to a new revision. If we
             * have ongoing transitions, these should create conflicts */
            return Object.fromEntries(
                Object.entries(getState()).map(([key, todo]) => [key, { ...todo, revision: todo.revision + 10 }]),
            );
        }

        return getState();
    },
);
