import type { FC, PropsWithChildren } from 'react';
import { useState } from 'react';
import { useSelector } from 'react-redux';

import { TodoItem } from '~usecases/lib/components/todo/TodoItem';
import { selectOptimisticEpics } from '~usecases/lib/store/epics/selectors';
import type { Epic } from '~usecases/lib/store/types';
import { generateId } from '~usecases/lib/utils/mock-api';

type Props = {
    onCreateTodo: (todo: Epic) => void;
    onEditTodo: (todo: Epic) => void;
    onDeleteTodo: (todo: Epic) => void;
};

export const TodoApp: FC<PropsWithChildren<Props>> = ({ onCreateTodo, onDeleteTodo, onEditTodo }) => {
    const epics = useSelector(selectOptimisticEpics);
    const [value, setValue] = useState('');

    const handleAdd = (value: string) => {
        const sanitized = value.trim();
        if (sanitized) {
            onCreateTodo({ id: generateId(), value, done: false, revision: 0, createdAt: Date.now() });
            setValue('');
        }
    };

    return (
        <div className="pb-3">
            <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Epics</h3>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                    recordState
                </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle">
                <svg
                    className="w-3 h-3 text-gray-600 flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                </svg>
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyUp={(e) => e.key === 'Enter' && handleAdd(value)}
                    className="flex-grow h-6 text-xs text-gray-300 bg-transparent focus:outline-none placeholder:text-gray-600 placeholder:italic"
                    type="text"
                    placeholder="Add an epic..."
                />
            </div>
            {epics.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onEdit={onEditTodo} onDelete={onDeleteTodo} />
            ))}
        </div>
    );
};
