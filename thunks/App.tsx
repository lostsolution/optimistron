import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import { Layout } from '~usecases/lib/components/todo/Layout';
import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import type { Todo } from '~usecases/lib/store/types';
import type { store } from '~usecases/thunks';
import { createTodoThunk, deleteTodoTunk, editTodoThunk } from '~usecases/thunks/thunk';

const description = `This usecase handles async operations using async thunks.`;
export const App: FC = () => {
    const dispatch = useDispatch() as typeof store.dispatch;

    const handleCreate = async (todo: Todo) => dispatch(createTodoThunk(todo));
    const handleEdit = async (update: Todo) => dispatch(editTodoThunk(update.id, update));
    const handleDelete = async ({ id }: Todo) => dispatch(deleteTodoTunk(id));

    return (
        <Layout title="Thunks" description={description}>
            <TodoApp onCreateTodo={handleCreate} onEditTodo={handleEdit} onDeleteTodo={handleDelete} />
        </Layout>
    );
};
