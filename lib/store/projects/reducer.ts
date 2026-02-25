import { optimistron } from '~optimistron';
import { nestedRecordState } from '~state/record';

import { sync } from '~usecases/lib/store/epics/actions';
import { createProjectTodo, deleteProjectTodo, editProjectTodo } from '~usecases/lib/store/projects/actions';
import type { ProjectTodo } from '~usecases/lib/store/types';
import { generateId } from '~usecases/lib/utils/mock-api';

const compare = (a: ProjectTodo) => (b: ProjectTodo) => {
    if (a.revision === b.revision) return 0;
    if (a.revision > b.revision) return 1;
    return -1;
};

const eq = (a: ProjectTodo) => (b: ProjectTodo) => a.done === b.done && a.value === b.value;

const initial = (() => {
    const createdAt = Date.now();
    const items: ProjectTodo[] = [
        { id: generateId(), projectId: 'frontend', value: 'Set up component library', done: true, revision: 0, createdAt },
        { id: generateId(), projectId: 'frontend', value: 'Add dark mode toggle', done: false, revision: 0, createdAt },
        { id: generateId(), projectId: 'backend', value: 'Implement auth middleware', done: false, revision: 3, createdAt },
        { id: generateId(), projectId: 'design', value: 'Design landing page', done: true, revision: 1, createdAt },
    ];

    const state: Record<string, Record<string, ProjectTodo>> = {};
    for (const item of items) {
        state[item.projectId] ??= {};
        state[item.projectId][item.id] = item;
    }
    return state;
})();

const { reducer: projects, selectors } = optimistron(
    'projects',
    initial,
    nestedRecordState<ProjectTodo>()({ keys: ['projectId', 'id'], compare, eq }),
    {
        create: createProjectTodo,
        update: editProjectTodo,
        remove: deleteProjectTodo,
        reducer: ({ getState }, action) => {
            if (sync.match(action)) {
                const state = getState();
                return Object.fromEntries(
                    Object.entries(state).map(([projectId, todos]) => [
                        projectId,
                        Object.fromEntries(
                            Object.entries(todos).map(([todoId, todo]) => [
                                todoId,
                                { ...todo, revision: todo.revision + 10 },
                            ]),
                        ),
                    ]),
                );
            }

            return getState();
        },
    },
);

export { projects, selectors as projectsSelectors };
