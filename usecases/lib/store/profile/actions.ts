import { createTransitions } from '~actions';
import type { Profile } from '~usecases/lib/store/types';

const updatePrepare = (item: Partial<Profile>) => ({ payload: { item }, transitionId: 'profile' });
const clearPrepare = () => ({ payload: {}, transitionId: 'profile' });

export const updateProfile = createTransitions('profile::update')(updatePrepare);
export const clearProfile = createTransitions('profile::clear')(clearPrepare);
