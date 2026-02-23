import { type FC } from 'react';
import { useDispatch } from 'react-redux';
import { Layout, type UsecaseDescription } from '~usecases/lib/components/todo/Layout';

import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';
import type { Todo } from '~usecases/lib/store/types';
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

import { C, F, O, X } from '~usecases/lib/components/todo/CodeTags';

const description: UsecaseDescription = {
    subtitle: 'Component-level async — the simplest optimistic pattern.',
    howItWorks: [
        <>Component dispatches <O>stage</O>, then awaits the API call.</>,
        <>On success: <O>amend</O> (server ID) → <C>commit</C>. On failure: <F>fail</F>.</>,
        <>Optimistic state is computed at the selector level — no state copies.</>,
    ],
    tryIt: [
        <>Add a todo online — appears instantly (<O>opt</O>), then <C>commits</C>.</>,
        <>Toggle offline, add a todo — it <F>fails</F> with a jiggle.</>,
        <>Toggle back online — <F>failed</F> todos auto-retry.</>,
        <>Click "Sync API" — observe <X>conflict</X> detection.</>,
    ],
};

export const App: FC = () => {
    const dispatch = useDispatch();

    const handleCreate = async (todo: Todo) => {
        const transitionId = todo.id;

        try {
            dispatch(createTodo.stage(todo));
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
            dispatch(editTodo.stage(todo.id, todo));
            await simulateAPIRequest();
            dispatch(editTodo.commit(transitionId));
        } catch (error) {
            dispatch(editTodo.fail(transitionId, error));
        }
    };

    const handleDelete = async (todo: Todo) => {
        const transitionId = todo.id;
        try {
            dispatch(deleteTodo.stage(todo.id));
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
