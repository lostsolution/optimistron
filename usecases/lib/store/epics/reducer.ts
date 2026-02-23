import { optimistron } from '~optimistron';
import { recordState } from '~state/record';

import { createEpic, deleteEpic, editEpic, sync } from '~usecases/lib/store/epics/actions';
import type { Epic } from '~usecases/lib/store/types';
import { generateId } from '~usecases/lib/utils/mock-api';

const initial = (() => {
    const createdAt = Date.now();
    const e1: Epic = { id: generateId(), value: 'Try out optimistron', revision: 0, done: true, createdAt };
    const e2: Epic = { id: generateId(), value: 'Toggle API Mock', revision: 42, done: false, createdAt };
    const e3: Epic = { id: generateId(), value: 'Add a new epic', revision: 2, done: true, createdAt };

    return { [e1.id]: e1, [e2.id]: e2, [e3.id]: e3 };
})();

const compare = (a: Epic) => (b: Epic) => {
    if (a.revision === b.revision) return 0;
    if (a.revision > b.revision) return 1;
    return -1;
};

const eq = (a: Epic) => (b: Epic) => a.done === b.done && a.value === b.value;

export const { reducer: epics, selectOptimistic } = optimistron(
    'epics',
    initial,
    recordState<Epic>({ key: 'id', compare, eq }),
    {
        create: createEpic,
        update: editEpic,
        remove: deleteEpic,
        reducer: ({ getState }, action) => {
            if (sync.match(action)) {
                return Object.fromEntries(
                    Object.entries(getState()).map(([key, epic]) => [
                        key,
                        { ...epic, revision: epic.revision + 10 },
                    ]),
                );
            }

            return getState();
        },
    },
);
