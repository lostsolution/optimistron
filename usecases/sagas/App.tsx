import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import { Layout, type UsecaseDescription } from '~usecases/lib/components/todo/Layout';
import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';
import type { Todo } from '~usecases/lib/store/types';

const O = ({ children }: { children: string }) => <code className="text-blue-400 font-mono text-[11px]">{children}</code>;
const F = ({ children }: { children: string }) => <code className="text-amber-400 font-mono text-[11px]">{children}</code>;

const description: UsecaseDescription = {
    subtitle: 'Redux sagas — the most decoupled approach.',
    howItWorks: [
        <>Component only dispatches <O>stage</O> — that's it.</>,
        <>Saga observes <O>stage</O> and drives the full transition lifecycle.</>,
        <>Max separation: UI fires intent, saga handles orchestration.</>,
    ],
    tryIt: [
        <>Add a todo — component dispatches a single <O>stage</O> action.</>,
        <>Toggle offline, add a todo — saga catches the <F>failure</F>.</>,
        <>Toggle back online — <F>failed</F> todos auto-retry via saga.</>,
        <>Compare to Basic and Thunks — most decoupled pattern.</>,
    ],
};

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
