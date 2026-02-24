import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import type { StagedAction } from '~transitions';

import { ActivityFeed } from '~usecases/lib/components/activity/ActivityFeed';
import { ProfileCard } from '~usecases/lib/components/profile/ProfileCard';
import { ProjectBoard } from '~usecases/lib/components/projects/ProjectBoard';
import { Layout, type UsecaseDescription } from '~usecases/lib/components/todo/Layout';
import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import { useAutoRetry } from '~usecases/lib/hooks/useAutoRetry';
import { dismissActivity, editActivity, logActivity } from '~usecases/lib/store/activity/actions';
import { createEpic, deleteEpic, editEpic } from '~usecases/lib/store/epics/actions';
import { updateProfile } from '~usecases/lib/store/profile/actions';
import { createProjectTodo, deleteProjectTodo, editProjectTodo } from '~usecases/lib/store/projects/actions';
import type { ActivityEntry, Epic, Profile, ProjectTodo } from '~usecases/lib/store/types';

import { C, F, O } from '~usecases/lib/components/todo/CodeTags';

const description: UsecaseDescription = {
    subtitle: 'Redux sagas — the most decoupled approach.',
    howItWorks: [
        <>Component only dispatches <O>stage</O> — that's it. No async, no lifecycle awareness.</>,
        <>Saga watcher observes <O>stage</O> via <code className="text-gray-400 text-[11px]">takeEvery</code> and orchestrates the full lifecycle to <C>commit</C> or <F>fail</F>.</>,
        <>Maximum separation: UI fires intent, saga handles all orchestration — components are pure dispatch.</>,
        <>Retry is a one-liner: <code className="text-gray-400 text-[11px]">dispatch(action)</code> — the saga picks it up automatically.</>,
    ],
};

export const App: FC = () => {
    const dispatch = useDispatch();

    const handleCreateEpic = (epic: Epic) => dispatch(createEpic.stage(epic));
    const handleEditEpic = (epic: Epic) => dispatch(editEpic.stage(epic));
    const handleDeleteEpic = (epic: Epic) => dispatch(deleteEpic.stage({ id: epic.id }));
    const handleUpdateProfile = (update: Partial<Profile>) => dispatch(updateProfile.stage(update));
    const handleCreateProjectTodo = (todo: ProjectTodo) => dispatch(createProjectTodo.stage(todo));
    const handleEditProjectTodo = (todo: ProjectTodo) => dispatch(editProjectTodo.stage(todo));
    const handleDeleteProjectTodo = (todo: ProjectTodo) => dispatch(deleteProjectTodo.stage({ projectId: todo.projectId, id: todo.id }));
    const handleLogActivity = (entry: ActivityEntry) => dispatch(logActivity.stage(entry));
    const handleEditActivity = (entry: ActivityEntry) => dispatch(editActivity.stage(entry));
    const handleDismissActivity = (entry: ActivityEntry) => dispatch(dismissActivity.stage({ id: entry.id }));

    /** Sagas observe stage actions — retry is just a re-dispatch */
    const retryTransition = (action: StagedAction) => dispatch(action);

    useAutoRetry(retryTransition);

    return (
        <Layout title="Sagas" description={description}>
            <ProfileCard onUpdate={handleUpdateProfile} />
            <div className="grad-h my-1" />
            <TodoApp onCreateTodo={handleCreateEpic} onEditTodo={handleEditEpic} onDeleteTodo={handleDeleteEpic} onRetry={retryTransition} />
            <div className="grad-h my-1" />
            <ProjectBoard
                onCreateTodo={handleCreateProjectTodo}
                onEditTodo={handleEditProjectTodo}
                onDeleteTodo={handleDeleteProjectTodo}
            />
            <div className="grad-h my-1" />
            <ActivityFeed
                onLogActivity={handleLogActivity}
                onEditActivity={handleEditActivity}
                onDismissActivity={handleDismissActivity}
                onRetry={retryTransition}
            />
            <div className="h-4" />
        </Layout>
    );
};
