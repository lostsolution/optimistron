import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import { Layout } from '~usecases/lib/components/todo/Layout';
import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';
import type { Todo } from '~usecases/lib/store/types';

const description = `
This usecase handles async operations using redux sagas :
each staging transition is observed and triggers the appropriate
transition sequence.`;

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
        <Layout title="Sagas" description={description}>
            <TodoApp onCreateTodo={handleCreate} onEditTodo={handleEdit} onDeleteTodo={handleDelete} />
        </Layout>
    );
};
