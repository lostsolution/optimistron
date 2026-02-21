import type { FC, PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import type { TransitionAction } from '~transitions';

import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';
import { TodoItem } from '~usecases/lib/components/todo/TodoItem';
import { createTodo, editTodo } from '~usecases/lib/store/actions';
import { selectFailedTodos, selectOptimisticTodos } from '~usecases/lib/store/selectors';
import type { Todo } from '~usecases/lib/store/types';
import { generateId } from '~usecases/lib/utils/mock-api';

type Props = {
    onCreateTodo: (todo: Todo) => void;
    onEditTodo: (todo: Todo) => void;
    onDeleteTodo: (todo: Todo) => void;
};

export const TodoApp: FC<PropsWithChildren<Props>> = ({ onCreateTodo, onDeleteTodo, onEditTodo }) => {
    const todos = useSelector(selectOptimisticTodos);
    const failedTransitions = useSelector(selectFailedTodos);
    const mockApi = useMockApi();

    const [value, setValue] = useState('');

    const handleAddTodo = (value: string) => {
        const sanitized = value.trim();
        if (sanitized) {
            onCreateTodo({ id: generateId(), value, done: false, revision: 0, createdAt: Date.now() });
            setValue('');
        }
    };

    const handleRetry = (action: TransitionAction) => {
        if (createTodo.stage.match(action)) return onCreateTodo(action.payload.todo);
        if (editTodo.stage.match(action)) return onEditTodo(action.payload.todo);
    };

    useEffect(() => {
        if (mockApi.online) {
            failedTransitions.forEach((action) => {
                if (createTodo.stage.match(action)) return onCreateTodo(action.payload.todo);
                if (editTodo.stage.match(action)) return onEditTodo(action.payload.todo);
            });
        }
    }, [mockApi.online, failedTransitions]);

    return (
        <>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
                <svg
                    className="w-3.5 h-3.5 text-gray-600 flex-shrink-0"
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
                    onKeyUp={(e) => e.key === 'Enter' && handleAddTodo(value)}
                    className="flex-grow h-7 text-sm text-gray-300 bg-transparent focus:outline-none placeholder:text-gray-600 placeholder:italic"
                    type="text"
                    placeholder="Add a todo..."
                />
            </div>
            {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onEdit={onEditTodo} onRetry={handleRetry} onDelete={onDeleteTodo} />
            ))}
        </>
    );
};
