import { type FC } from 'react';
import { useDispatch } from 'react-redux';

import type { StagedAction } from '~transitions';

import { ActivityFeed } from '~usecases/lib/components/activity/ActivityFeed';
import { ProfileCard } from '~usecases/lib/components/profile/ProfileCard';
import { ProjectBoard } from '~usecases/lib/components/projects/ProjectBoard';
import { Layout, type UsecaseDescription } from '~usecases/lib/components/todo/Layout';
import { TodoApp } from '~usecases/lib/components/todo/TodoApp';
import { useAutoRetry } from '~usecases/lib/hooks/useAutoRetry';
import { editActivity, logActivity } from '~usecases/lib/store/activity/actions';
import { createEpic, editEpic } from '~usecases/lib/store/epics/actions';
import { updateProfile } from '~usecases/lib/store/profile/actions';
import { createProjectTodo, editProjectTodo } from '~usecases/lib/store/projects/actions';
import type { ActivityEntry, Epic, Profile, ProjectTodo } from '~usecases/lib/store/types';
import type { store } from '~usecases/thunks';
import {
    createEpicThunk,
    createProjectTodoThunk,
    deleteEpicThunk,
    deleteProjectTodoThunk,
    dismissActivityThunk,
    editActivityThunk,
    editEpicThunk,
    editProjectTodoThunk,
    logActivityThunk,
    updateProfileThunk,
} from '~usecases/thunks/thunk';

import { C, F, O } from '~usecases/lib/components/todo/CodeTags';

const description: UsecaseDescription = {
    subtitle: 'Redux thunks — same lifecycle, cleaner components.',
    howItWorks: [
        <>Component dispatches a thunk — no transition management in the component at all.</>,
        <>Each thunk encapsulates the full lifecycle: <O>stage</O> → API → <O>amend</O> → <C>commit</C> / <F>fail</F>.</>,
        <>Same optimistic behavior as Basic — components only call <code className="text-gray-400 text-[11px]">dispatch(thunk(item))</code>.</>,
        <>Retry routes the failed stage action through the matching thunk — same pattern, thinner component.</>,
    ],
};

export const App: FC = () => {
    const dispatch = useDispatch() as typeof store.dispatch;

    const handleCreateEpic = async (epic: Epic) => dispatch(createEpicThunk(epic));
    const handleEditEpic = async (epic: Epic) => dispatch(editEpicThunk(epic.id, epic));
    const handleDeleteEpic = async ({ id }: Epic) => dispatch(deleteEpicThunk(id));
    const handleUpdateProfile = async (update: Partial<Profile>) => dispatch(updateProfileThunk(update));
    const handleCreateProjectTodo = async (todo: ProjectTodo) => dispatch(createProjectTodoThunk(todo));
    const handleEditProjectTodo = async (todo: ProjectTodo) => dispatch(editProjectTodoThunk(todo));
    const handleDeleteProjectTodo = async (todo: ProjectTodo) => dispatch(deleteProjectTodoThunk(todo));
    const handleLogActivity = async (entry: ActivityEntry) => dispatch(logActivityThunk(entry));
    const handleEditActivity = async (entry: ActivityEntry) => dispatch(editActivityThunk(entry));
    const handleDismissActivity = async (entry: ActivityEntry) => dispatch(dismissActivityThunk(entry));

    /** Route a failed stage action through the correct thunk.
     * CRUD update payloads are `Partial<T>` — cast to full type since
     * failed stage actions always carry the complete entity. */
    const retryTransition = (action: StagedAction) => {
        if (createEpic.stage.match(action)) return handleCreateEpic(action.payload.item);
        if (editEpic.stage.match(action)) return handleEditEpic(action.payload.item as Epic);
        if (updateProfile.stage.match(action)) return handleUpdateProfile(action.payload.item);
        if (createProjectTodo.stage.match(action)) return handleCreateProjectTodo(action.payload.item);
        if (editProjectTodo.stage.match(action)) return handleEditProjectTodo(action.payload.item as ProjectTodo);
        if (logActivity.stage.match(action)) return handleLogActivity(action.payload.item);
        if (editActivity.stage.match(action)) return handleEditActivity(action.payload.item as ActivityEntry);
    };

    useAutoRetry(retryTransition);

    return (
        <Layout title="Thunks" description={description}>
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
