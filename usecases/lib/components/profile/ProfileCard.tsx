import { clsx } from 'clsx';
import { type FC, useRef } from 'react';
import { useSelector } from 'react-redux';

import { Spinner } from '~usecases/lib/components/todo/Icons';
import { useProfileState } from '~usecases/lib/store/profile/hooks';
import { selectOptimisticProfile } from '~usecases/lib/store/profile/selectors';
import type { Profile } from '~usecases/lib/store/types';

type Props = {
    onUpdate: (update: Partial<Profile> & { revision: number }) => void;
};

export const ProfileCard: FC<Props> = ({ onUpdate }) => {
    const profile = useSelector(selectOptimisticProfile);
    const { loading, failed, conflict } = useProfileState();
    const nameRef = useRef<HTMLInputElement>(null);
    const avatarRef = useRef<HTMLInputElement>(null);

    if (!profile) return null;

    const error = failed || conflict;

    const handleCommit = () => {
        const nameEl = nameRef.current;
        const avatarEl = avatarRef.current;
        if (!nameEl || !avatarEl) return;

        const changes: Partial<Profile> = {};
        const name = nameEl.value.trim();
        const avatar = avatarEl.value.trim();

        if (name && name !== profile.displayName) changes.displayName = name;
        else nameEl.value = profile.displayName;

        if (avatar && avatar !== profile.avatarUrl) changes.avatarUrl = avatar;
        else avatarEl.value = profile.avatarUrl;

        if (Object.keys(changes).length > 0) {
            onUpdate({ ...changes, revision: profile.revision + 1 });
        }
    };

    return (
        <div className="pb-3">
            <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Profile</h3>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-400">
                    singularState
                </span>
            </div>

            <div
                className={clsx(
                    'flex items-center gap-2.5 mx-3 p-2 rounded-lg border transition-colors',
                    error ? 'border-oc-fail/30 bg-oc-fail/5' : 'border-border-subtle bg-surface-1',
                    conflict && '!border-oc-conflict/30 !bg-oc-conflict/5',
                )}
            >
                <img src={profile.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0 bg-surface-3" />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                            <input
                                ref={nameRef}
                                type="text"
                                readOnly={loading}
                                defaultValue={profile.displayName}
                                className={clsx(
                                    'text-xs font-medium bg-transparent focus:outline-none w-full truncate cursor-pointer focus:cursor-text',
                                    loading && 'text-oc-commit/60 pointer-events-none',
                                    failed && !conflict && 'text-oc-fail/80',
                                    conflict && 'text-oc-conflict/80',
                                    !loading && !error && 'text-gray-200',
                                )}
                                onBlur={handleCommit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommit();
                                    if (e.key === 'Escape') {
                                        e.currentTarget.value = profile.displayName;
                                        e.currentTarget.blur();
                                    }
                                }}
                            />
                            <input
                                ref={avatarRef}
                                type="text"
                                readOnly={loading}
                                defaultValue={profile.avatarUrl}
                                className={clsx(
                                    'text-[10px] font-mono bg-transparent focus:outline-none w-full truncate cursor-pointer focus:cursor-text',
                                    loading ? 'text-gray-700 pointer-events-none' : 'text-gray-600',
                                )}
                                onBlur={handleCommit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommit();
                                    if (e.key === 'Escape') {
                                        e.currentTarget.value = profile.avatarUrl;
                                        e.currentTarget.blur();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {loading && <Spinner />}
                            <code className="text-[7px] font-mono leading-none">
                                {loading && <span className="text-oc-commit/60">optimistic</span>}
                                {failed && !conflict && <span className="text-oc-fail/80">fail</span>}
                                {conflict && <span className="text-oc-conflict/80">conflict</span>}
                            </code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
