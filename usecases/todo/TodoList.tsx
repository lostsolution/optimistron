import { FC, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { generateId } from '../../src/utils';
import { TodoItem } from './TodoItem';
import { createTodo, selectOptimisticTodos } from './store';

export const TodoList: FC = () => {
    const dispatch = useDispatch();
    const todos = useSelector(selectOptimisticTodos);

    const [value, setValue] = useState('');

    const addTodo = (value: string) => {
        const optimisticId = generateId();
        dispatch(createTodo.stage(optimisticId, { id: optimisticId, value, revision: 1 }));
        setValue('');
    };

    return (
        <div className="max-w-lg p-6 bg-white border border-gray-200 rounded-lg shadow ">
            <h1 className="text-2xl mb-4">To-Do List</h1>
            <input
                type="text"
                className="w-full border p-2 mb-4"
                placeholder="Add a new task"
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
            <button className="bg-blue-500 text-white p-2" onClick={() => addTodo(value)}>
                Add
            </button>
            <ul>
                {todos.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} />
                ))}
            </ul>
        </div>
    );
};
