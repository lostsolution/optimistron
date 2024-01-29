import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import type { Todo } from '~usecases/lib/store/types';
import type { store } from '~usecases/thunks';
import { createTodoThunk, deleteTodoTunk, editTodoThunk } from '~usecases/thunks/thunk';

export const App: FC = () => {
    const dispatch = useDispatch() as typeof store.dispatch;

    const handleCreate = async (todo: Todo) => dispatch(createTodoThunk(todo));
    const handleEdit = async (update: Todo) => dispatch(editTodoThunk(update.id, update));
    const handleDelete = async ({ id }: Todo) => dispatch(deleteTodoTunk(id));

    return (
        <>
            <h1 className="text-2xl mb-4">Thunks</h1>
            <blockquote className="p-4 my-4 border-s-4 border-gray-300 bg-gray-50">
                <p className="text-sm italic font-medium leading-relaxed text-gray-900">
                    This usecase handles async operations using async thunks.
                </p>
            </blockquote>

            <TodoApp onCreateTodo={handleCreate} onEditTodo={handleEdit} onDeleteTodo={handleDelete} />
        </>
    );
};
