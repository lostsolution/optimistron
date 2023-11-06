import { FC, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { generateId } from '../utils/generateId';
import { TodoItem } from './TodoItem';
import { createTodo, selectOptimisticTodos } from './store';

export const TodoList: FC = () => {
    const dispatch = useDispatch();
    const todos = useSelector(selectOptimisticTodos);

    const [value, setValue] = useState('');

    const addTodo = (value: string) => {
        const optimisticId = generateId();
        dispatch(createTodo.stage(optimisticId, { id: optimisticId, value, revision: 0, done: false }));
        setValue('');
    };

    return (
        <div className="w-[80%] max-w-xl p-6 bg-white border border-gray-200 rounded-lg shadow ">
            <h1 className="text-2xl mb-4">Todos</h1>
            <div className="flex gap-2">
                <input
                    type="text"
                    className="w-full border p-2 mb-4"
                    placeholder="Add a new task"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                <button
                    className="bg-blue-500 text-white p-2 h-full border border-gray-200"
                    onClick={() => addTodo(value)}
                >
                    Add
                </button>
            </div>
            <ul>
                {todos.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} />
                ))}
            </ul>
        </div>
    );
};
