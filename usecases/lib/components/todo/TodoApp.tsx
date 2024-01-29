import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import type { TransitionAction } from '~transitions';

import { TransitionGraph } from '~usecases/lib/components/graph/TransitionGraph';
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

export const TodoApp: FC<Props> = ({ onCreateTodo, onEditTodo, onDeleteTodo }) => {
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
        <div className="flex flex-col w-full h-full justify-between overflow-hidden">
            <div className="flex-1 max-w-lg overflow-auto">
                <div className="flex flex-rows gap-2">
                    <button className="flex items-center w-full h-8 px-2 mt-2 text-sm font-medium rounded">
                        <svg
                            className="w-5 h-5 text-gray-400 fill-current"
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
                            className="flex-grow h-8 ml-4 bg-transparent focus:outline-none font-medium"
                            type="text"
                            placeholder="add a new task"
                        />
                    </button>
                </div>
                <hr className="my-2" />
                {todos.map((todo) => (
                    <TodoItem
                        key={todo.id}
                        todo={todo}
                        onEdit={onEditTodo}
                        onRetry={handleRetry}
                        onDelete={onDeleteTodo}
                    />
                ))}
            </div>
            <div>
                <hr className="mb-1" />
                <div className="overflow-x-hidden flex align-center">
                    <TransitionGraph />
                </div>
            </div>
        </div>
    );
};
