import { optimistron } from '~optimistron';
import { listState } from '~state/list';

import { dismissActivity, editActivity, logActivity } from '~usecases/lib/store/activity/actions';
import { sync } from '~usecases/lib/store/epics/actions';
import type { ActivityEntry } from '~usecases/lib/store/types';

const compare = (a: ActivityEntry, b: ActivityEntry) => {
    if (a.revision === b.revision) return 0 as const;
    if (a.revision > b.revision) return 1 as const;
    return -1 as const;
};

const eq = (a: ActivityEntry, b: ActivityEntry) => a.message === b.message && a.category === b.category;

const { reducer: activity, selectors } = optimistron(
    'activity',
    [] as ActivityEntry[],
    listState<ActivityEntry>({ key: 'id', compare, eq }),
    {
        create: logActivity,
        update: editActivity,
        remove: dismissActivity,
        reducer: ({ getState }, action) => {
            if (sync.match(action)) {
                return getState().map((entry) => ({ ...entry, revision: entry.revision + 10 }));
            }

            return getState();
        },
    },
);

export { activity, selectors as activitySelectors };
