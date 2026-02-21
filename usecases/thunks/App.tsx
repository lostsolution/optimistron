import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import { Layout, type UsecaseDescription } from '~usecases/lib/components/todo/Layout';
import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import type { Todo } from '~usecases/lib/store/types';
import type { store } from '~usecases/thunks';
import { createTodoThunk, deleteTodoTunk, editTodoThunk } from '~usecases/thunks/thunk';

const C = ({ children }: { children: string }) => <code className="text-emerald-400 font-mono text-[11px]">{children}</code>;
const O = ({ children }: { children: string }) => <code className="text-blue-400 font-mono text-[11px]">{children}</code>;
const F = ({ children }: { children: string }) => <code className="text-amber-400 font-mono text-[11px]">{children}</code>;

const description: UsecaseDescription = {
    subtitle: 'Redux thunks — same lifecycle, cleaner components.',
    howItWorks: [
        <>Component dispatches a thunk — no direct transition management.</>,
        <>Thunk handles <O>stage</O> → API → <O>amend</O>/<C>commit</C> or <F>fail</F>.</>,
        <>Same optimistic behavior — components are thinner.</>,
    ],
    tryIt: [
        <>Add a todo online — same instant <O>opt</O>, simpler component code.</>,
        <>Toggle offline, add a todo — thunk catches and dispatches <F>fail</F>.</>,
        <>Toggle back online — <F>failed</F> todos auto-retry.</>,
        <>Compare to Basic — note how much cleaner the component is.</>,
    ],
};

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
