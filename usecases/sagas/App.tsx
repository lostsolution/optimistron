import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';
import type { Todo } from '~usecases/lib/store/types';

export const App: FC = () => {
    const dispatch = useDispatch();

    const handleCreate = async (todo: Todo) => {
        const transitionId = todo.id;
        dispatch(createTodo.stage(transitionId, todo));
    };

    const handleEdit = async (todo: Todo) => {
        const transitionId = todo.id;
        dispatch(editTodo.stage(transitionId, todo.id, todo));
    };

    const handleDelete = async (todo: Todo) => {
        const transitionId = todo.id;
        dispatch(deleteTodo.stage(transitionId, todo.id));
    };

    return (
        <>
            <h1 className="text-2xl mb-4">Sagas</h1>
            <blockquote className="p-4 my-4 border-s-4 border-gray-300 bg-gray-50">
                <p className="text-sm italic font-medium leading-relaxed text-gray-900">
                    This usecase handles async operations using redux sagas : each staging transition is observed and
                    triggers the appropriate transition sequence.
                </p>
            </blockquote>

            <TodoApp onCreateTodo={handleCreate} onEditTodo={handleEdit} onDeleteTodo={handleDelete} />
        </>
    );
};
