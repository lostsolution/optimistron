import { clsx } from 'clsx';
import { type FC, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import type { StagedAction } from '~transitions';

import { Cross, Spinner } from '~usecases/lib/components/todo/Icons';
import { useActivityState } from '~usecases/lib/store/activity/hooks';
import { selectOptimisticActivity } from '~usecases/lib/store/activity/selectors';
import type { ActivityEntry } from '~usecases/lib/store/types';
import { generateId } from '~usecases/lib/utils/mock-api';

const CATEGORIES = ['user', 'system', 'error'] as const;

const CATEGORY_COLORS: Record<ActivityEntry['category'], string> = {
    system: 'bg-blue-500/15 text-blue-400',
    user: 'bg-emerald-500/15 text-emerald-400',
    error: 'bg-rose-500/15 text-rose-400',
};

type ActivityItemProps = {
    entry: ActivityEntry;
    onEdit: (entry: ActivityEntry) => void;
    onDismiss: (entry: ActivityEntry) => void;
    onRetry: (action: StagedAction) => void;
};

const ActivityItem: FC<ActivityItemProps> = ({ entry, onEdit, onDismiss, onRetry }) => {
    const { loading, failed, conflict, failedAction } = useActivityState(entry);
    const ref = useRef<HTMLInputElement>(null);
    const error = failed || conflict;

    const handleCommit = () => {
        const message = ref.current?.value.trim();
        if (!message || message === entry.message) return;

        if (failedAction) {
            const { payload } = failedAction as StagedAction<{ item: ActivityEntry }>;
            const retry = { ...failedAction, payload: { ...payload, item: { ...payload.item, message } } };
            onRetry(retry);
        } else {
            onEdit({ ...entry, message, revision: entry.revision + 1 });
        }
    };

    const ts = new Date(entry.timestamp);
    const time = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}`;

    return (
        <div
            className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded group',
                loading && 'opacity-70',
                error && 'bg-oc-fail/5',
            )}
        >
            <span className={clsx('text-[8px] font-mono px-1 py-0.5 rounded flex-shrink-0', CATEGORY_COLORS[entry.category])}>
                {entry.category}
            </span>

            <input
                ref={ref}
                type="text"
                readOnly={loading}
                defaultValue={entry.message}
                key={entry.message}
                onBlur={handleCommit}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
                className={clsx(
                    'flex-1 min-w-0 text-xs bg-transparent focus:outline-none cursor-pointer focus:cursor-text transition-colors',
                    !error && !loading && 'text-gray-300 hover:text-gray-200',
                    loading && 'text-oc-commit/60',
                    failed && !conflict && 'text-oc-fail/80 jiggle',
                    conflict && 'text-oc-conflict/80 jiggle',
                )}
            />

            <code className="text-[7px] font-mono leading-none flex-shrink-0">
                {loading && <span className="text-oc-commit/60">opt</span>}
                {failed && !conflict && <span className="text-oc-fail/80">fail</span>}
                {conflict && <span className="text-oc-conflict/80">conflict</span>}
            </code>

            {loading && <Spinner />}

            <span className="text-[9px] font-mono text-gray-700 flex-shrink-0">{time}</span>

            <button
                onClick={() => onDismiss(entry)}
                className="text-gray-700 hover:text-oc-fail transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
                <Cross />
            </button>
        </div>
    );
};

type Props = {
    onLogActivity: (entry: ActivityEntry) => void;
    onEditActivity: (entry: ActivityEntry) => void;
    onDismissActivity: (entry: ActivityEntry) => void;
    onRetry: (action: StagedAction) => void;
};

export const ActivityFeed: FC<Props> = ({ onLogActivity, onEditActivity, onDismissActivity, onRetry }) => {
    const entries = useSelector(selectOptimisticActivity);
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<ActivityEntry['category']>('user');

    const handleAdd = () => {
        const sanitized = message.trim();
        if (sanitized) {
            onLogActivity({ id: generateId(), message: sanitized, category, timestamp: Date.now(), revision: 0 });
            setMessage('');
        }
    };

    return (
        <div className="pb-3">
            <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Activity Log</h3>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-green-500/10 text-green-400">
                    listState
                </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle">
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ActivityEntry['category'])}
                    className="text-[9px] bg-surface-3 text-gray-400 border border-border-subtle rounded px-1 py-0.5 focus:outline-none"
                >
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyUp={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-grow h-6 text-xs text-gray-300 bg-transparent focus:outline-none placeholder:text-gray-600 placeholder:italic"
                    type="text"
                    placeholder="Log activity..."
                />
            </div>

            <div className="py-1">
                {entries.map((entry) => (
                    <ActivityItem
                        key={entry.id}
                        entry={entry}
                        onEdit={onEditActivity}
                        onDismiss={onDismissActivity}
                        onRetry={onRetry}
                    />
                ))}
                {entries.length === 0 && (
                    <p className="px-3 py-2 text-[10px] text-gray-700 italic">No activity logged</p>
                )}
            </div>
        </div>
    );
};
