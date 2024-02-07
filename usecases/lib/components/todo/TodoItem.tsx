import { clsx } from 'clsx';
import { useMemo, useState, type FC } from 'react';
import { useSelector } from 'react-redux';

import type { TransitionAction } from '~transitions';

import { CheckMark, Cross, Spinner } from '~usecases/lib/components/todo/Icons';
import { useTodoState } from '~usecases/lib/store/hooks';
import { selectTodo } from '~usecases/lib/store/selectors';
import type { Todo } from '~usecases/lib/store/types';

type Props = {
    todo: Todo;
    onRetry: (action: TransitionAction) => void;
    onEdit: (todo: Todo) => void;
    onDelete: (todo: Todo) => void;
};

const TodoConflict: FC<{ id: string }> = ({ id }) => {
    const todo = useSelector(selectTodo(id));
    const Tag: keyof JSX.IntrinsicElements = todo.done ? 's' : 'em';

    return (
        <span className="text-xs text-red-400">
            Conflict : "<Tag>{todo.value}</Tag>"
        </span>
    );
};

export const TodoItem: FC<Props> = ({ todo, onEdit, onRetry, onDelete }) => {
    const id = `todo-${todo.id}`;
    const { loading, stashed, failed, conflict, failedAction } = useTodoState(todo);
    const [editable, setEditable] = useState(false);
    const error = failed || conflict;

    const handleMutation = (mutation: Partial<Todo>) => {
        if (loading) return;

        if (failedAction) {
            onRetry({
                ...failedAction,
                payload: {
                    todo: {
                        ...failedAction.payload.todo,
                        ...mutation,
                    },
                },
            });
        } else onEdit({ ...todo, revision: todo.revision + 1, ...mutation });
    };

    const icon = useMemo(() => {
        if (loading) return <Spinner />;
        if (failed) return <span className="text-xs">!</span>;
        return <CheckMark />;
    }, [loading, failed]);

    return (
        <div className="flex w-full justify-between items-center px-2 pt-1">
            <input className="hidden" type="checkbox" id={id} checked={todo.done} readOnly />
            <label
                htmlFor={id}
                className={clsx(
                    'todo-item flex flex-row grow items-center max-w-full h-8 px-2 rounded cursor-pointer hover:bg-gray-200',
                    loading && 'loading pointer-events-none',
                )}
            >
                <span
                    onClick={() => handleMutation({ done: !todo.done })}
                    className={clsx(
                        'todo--icon flex items-center justify-center w-5 h-5 border-2 border-gray-300 text-transparent rounded-full',
                        error && '!border-amber-500 text-amber-500',
                        todo.done && '!text-white !bg-emerald-500 !border-emerald-500',
                        todo.done && error && '!bg-amber-500',
                        loading && '!border-gray-300 !text-gray-500 !bg-transparent',
                    )}
                >
                    {icon}
                </span>

                <div className="flex-1 mx-4 flex flex-col">
                    {editable ? (
                        <input
                            type="text"
                            className="text-sm"
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
                                'todo--value hoverable flex-1 text-sm truncate text-nowrap',
                                todo.done && 'line-through text-gray-500',
                                (failed || stashed) && 'jiggle',
                            )}
                        >
                            {todo.value}
                        </span>
                    )}
                    {conflict && <TodoConflict id={todo.id} />}
                </div>

                <button
                    className="self-center font-light text-xs text-red-400 hover:opacity-80"
                    onClick={() => onDelete(todo)}
                >
                    <Cross />
                </button>
            </label>
        </div>
    );
};
