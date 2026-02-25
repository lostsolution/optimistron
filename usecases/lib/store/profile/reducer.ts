import { optimistron } from '~optimistron';
import { singularState } from '~state/singular';

import { sync } from '~usecases/lib/store/epics/actions';
import { clearProfile, updateProfile } from '~usecases/lib/store/profile/actions';
import type { Profile } from '~usecases/lib/store/types';

const compare = (a: Profile, b: Profile) => {
    if (a.revision === b.revision) return 0 as const;
    if (a.revision > b.revision) return 1 as const;
    return -1 as const;
};

const eq = (a: Profile, b: Profile) => a.displayName === b.displayName && a.avatarUrl === b.avatarUrl;

const initial: Profile = { displayName: 'Andy ZEN', avatarUrl: 'https://i.pravatar.cc/80?u=andy', revision: 0 };

const { reducer: profile, selectors } = optimistron(
    'profile',
    initial,
    singularState<Profile>({ compare, eq }),
    {
        update: updateProfile,
        remove: clearProfile,
        reducer: ({ getState }, action) => {
            if (sync.match(action)) {
                const state = getState();
                return state ? { ...state, revision: state.revision + 10 } : state;
            }

            return getState();
        },
    },
);

export { profile, selectors as profileSelectors };
