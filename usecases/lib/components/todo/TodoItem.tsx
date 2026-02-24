import { clsx } from 'clsx';
import { useMemo, useState, type FC } from 'react';
import { useSelector } from 'react-redux';

import { CheckMark, Cross, Spinner } from '~usecases/lib/components/todo/Icons';
import { useEpicState } from '~usecases/lib/store/epics/hooks';
import { selectEpic } from '~usecases/lib/store/epics/selectors';
import type { Epic } from '~usecases/lib/store/types';

type Props = {
    todo: Epic;
    onEdit: (todo: Epic) => void;
    onDelete: (todo: Epic) => void;
};

const EpicConflict: FC<{ id: string }> = ({ id }) => {
    const epic = useSelector(selectEpic(id));
    const Tag: keyof JSX.IntrinsicElements = epic.done ? 's' : 'em';

    return (
        <div className="text-[9px] font-mono text-oc-conflict/60 leading-tight">
            <span className="text-oc-conflict/80">conflict</span> "<Tag>{epic.value}</Tag>"
        </div>
    );
};

export const TodoItem: FC<Props> = ({ todo, onEdit, onDelete }) => {
    const id = `todo-${todo.id}`;
    const { loading, stashed, failed, conflict } = useEpicState(todo);
    const [editable, setEditable] = useState(false);
    const error = failed || conflict;

    const handleMutation = (mutation: Partial<Epic>) => {
        if (loading) return;
        onEdit({ ...todo, revision: todo.revision + 1, ...mutation });
    };

    const icon = useMemo(() => {
        if (loading) return <Spinner />;
        if (failed) return <span className="text-xs">!</span>;
        return <CheckMark />;
    }, [loading, failed]);

    return (
        <div className="flex w-full justify-between items-center px-2 pt-0.5">
            <input className="hidden" type="checkbox" id={id} checked={todo.done} readOnly />
            <label
                htmlFor={id}
                className={clsx(
                    'todo-item flex flex-row grow items-center max-w-full h-7 px-1.5 rounded cursor-pointer hover:bg-surface-3',
                    loading && 'loading pointer-events-none',
                )}
            >
                <span
                    onClick={() => handleMutation({ done: !todo.done })}
                    className={clsx(
                        'todo--icon flex items-center justify-center w-4 h-4 border-2 border-gray-600 text-transparent rounded-full',
                        failed && !conflict && '!border-oc-fail/80 text-oc-fail/80',
                        conflict && '!border-oc-conflict/80 text-oc-conflict/80',
                        todo.done && '!text-white !bg-oc-stage/90 !border-oc-stage/90',
                        todo.done && failed && !conflict && '!bg-oc-fail/80',
                        todo.done && conflict && '!bg-oc-conflict/80',
                        loading && '!border-gray-600 !text-gray-500 !bg-transparent',
                    )}
                >
                    {icon}
                </span>

                <div className="flex-1 mx-3 flex items-center gap-2">
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex items-center">
                            {editable ? (
                                <input
                                    type="text"
                                    className="text-xs flex-1 text-gray-200 bg-transparent focus:outline-none"
                                    defaultValue={todo.value}
                                    autoFocus
                                    onBlur={({ currentTarget }) => {
                                        const value = currentTarget.value;
                                        if (value !== todo.value) handleMutation({ value });

                                        setEditable(false);
                                    }}
                                    onKeyDown={({ currentTarget, key }) => {
                                        if (key === 'Enter') {
                                            const value = currentTarget.value;
                                            handleMutation({ value });
                                            setEditable(false);
                                        }
                                    }}
                                />
                            ) : (
                                <span
                                    onClick={() => setEditable(true)}
                                    className={clsx(
                                        'todo--value hoverable flex-1 text-xs truncate text-nowrap text-gray-300',
                                        todo.done && 'line-through !text-gray-600',
                                        loading && '!text-oc-commit/60',
                                        failed && !conflict && '!text-oc-fail/80 jiggle',
                                        conflict && '!text-oc-conflict/80 jiggle',
                                        stashed && !failed && '!text-oc-stash/80 jiggle',
                                    )}
                                >
                                    {todo.value}
                                </span>
                            )}
                        </div>
                        {conflict && <EpicConflict id={todo.id} />}
                    </div>
                    <code className="flex-shrink-0 self-center text-[7px] font-mono leading-none text-left">
                        {loading && <span className="text-oc-commit/60">optimistic</span>}
                        {failed && !conflict && <span className="text-oc-fail/80">fail</span>}
                        {conflict && <span className="text-oc-conflict/80">conflict</span>}
                        {stashed && <span className="text-oc-stash/80">stash</span>}
                    </code>
                </div>

                <button
                    className="self-center font-light text-xs text-gray-600 hover:text-oc-fail transition-colors"
                    onClick={() => onDelete(todo)}
                >
                    <Cross />
                </button>
            </label>
        </div>
    );
};
