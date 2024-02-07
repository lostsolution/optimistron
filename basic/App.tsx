import { type FC } from 'react';
import { useDispatch } from 'react-redux';
import { Layout } from '~usecases/lib/components/todo/Layout';

import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';
import type { Todo } from '~usecases/lib/store/types';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

const description = `
This usecase handles async operations at the component level.
In the real world you would use some kind of redux async middleware
to orchestrate your optimistic transitions.`;

export const App: FC = () => {
    const dispatch = useDispatch();

    const handleCreate = async (todo: Todo) => {
        const transitionId = todo.id;

        try {
            dispatch(createTodo.stage(transitionId, todo));
            await simulateAPIRequest();

            dispatch(createTodo.amend(transitionId, { ...todo, id: generateId() }));
            dispatch(createTodo.commit(transitionId));
        } catch (error) {
            dispatch(createTodo.fail(transitionId, error));
        }
    };

    const handleEdit = async (todo: Todo) => {
        const transitionId = todo.id;

        try {
            dispatch(editTodo.stage(transitionId, todo.id, todo));
            await simulateAPIRequest();
            dispatch(editTodo.commit(transitionId));
        } catch (error) {
            dispatch(editTodo.fail(transitionId, error));
        }
    };

    const handleDelete = async (todo: Todo) => {
        const transitionId = todo.id;
        try {
            dispatch(deleteTodo.stage(transitionId, todo.id));
            await simulateAPIRequest();
            dispatch(deleteTodo.commit(transitionId));
        } catch (error) {
            dispatch(deleteTodo.stash(transitionId));
        }
    };

    return (
        <Layout title="Basic" description={description}>
            <TodoApp onCreateTodo={handleCreate} onEditTodo={handleEdit} onDeleteTodo={handleDelete} />
        </Layout>
    );
};
