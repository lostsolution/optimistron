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
import { generateId, simulateAPIRequest } from '~usecases/lib/utils/mock-api';

import { C, F, O } from '~usecases/lib/components/todo/CodeTags';

const description: UsecaseDescription = {
    subtitle: 'Component-level async — full transition lifecycle managed in the component.',
    howItWorks: [
        <>Component dispatches <O>stage</O>, awaits the API, then <O>amend</O>s / <C>commit</C>s or <F>fail</F>s directly.</>,
        <>The full lifecycle (<O>stage</O> → API → <O>amend</O> → <C>commit</C> / <F>fail</F>) lives in the handler function — maximum visibility, minimum indirection.</>,
        <>Optimistic state is computed at the selector level via <code className="text-gray-400 text-[11px]">selectOptimistic</code> — no state copies, no checkpoints.</>,
        <>Failed transitions can be edited in-place — a new <O>stage</O> overwrites the failed one, restarting the lifecycle.</>,
    ],
};

export const App: FC = () => {
    const dispatch = useDispatch();

    const handleCreateEpic = async (epic: Epic) => {
        const transitionId = epic.id;
        try {
            dispatch(createEpic.stage(epic));
            await simulateAPIRequest();
            dispatch(createEpic.amend(transitionId, { ...epic, id: generateId() }));
            dispatch(createEpic.commit(transitionId));
        } catch (error) {
            dispatch(createEpic.fail(transitionId, error));
        }
    };

    const handleEditEpic = async (epic: Epic) => {
        const transitionId = epic.id;
        try {
            dispatch(editEpic.stage(epic));
            await simulateAPIRequest();
            dispatch(editEpic.commit(transitionId));
        } catch (error) {
            dispatch(editEpic.fail(transitionId, error));
        }
    };

    const handleDeleteEpic = async (epic: Epic) => {
        const transitionId = epic.id;
        try {
            dispatch(deleteEpic.stage({ id: epic.id }));
            await simulateAPIRequest();
            dispatch(deleteEpic.commit(transitionId));
        } catch (error) {
            dispatch(deleteEpic.stash(transitionId));
        }
    };

    const handleUpdateProfile = async (update: Partial<Profile>) => {
        try {
            dispatch(updateProfile.stage(update));
            await simulateAPIRequest();
            dispatch(updateProfile.commit('profile'));
        } catch (error) {
            dispatch(updateProfile.fail('profile', error));
        }
    };

    const handleCreateProjectTodo = async (todo: ProjectTodo) => {
        const transitionId = `${todo.projectId}/${todo.id}`;
        try {
            dispatch(createProjectTodo.stage(todo));
            await simulateAPIRequest();
            dispatch(createProjectTodo.amend(transitionId, { ...todo, id: generateId() }));
            dispatch(createProjectTodo.commit(transitionId));
        } catch (error) {
            dispatch(createProjectTodo.fail(transitionId, error));
        }
    };

    const handleEditProjectTodo = async (todo: ProjectTodo) => {
        const transitionId = `${todo.projectId}/${todo.id}`;
        try {
            dispatch(editProjectTodo.stage(todo));
            await simulateAPIRequest();
            dispatch(editProjectTodo.commit(transitionId));
        } catch (error) {
            dispatch(editProjectTodo.fail(transitionId, error));
        }
    };

    const handleDeleteProjectTodo = async (todo: ProjectTodo) => {
        const transitionId = `${todo.projectId}/${todo.id}`;
        try {
            dispatch(deleteProjectTodo.stage({ projectId: todo.projectId, id: todo.id }));
            await simulateAPIRequest();
            dispatch(deleteProjectTodo.commit(transitionId));
        } catch (error) {
            dispatch(deleteProjectTodo.stash(transitionId));
        }
    };

    const handleLogActivity = async (entry: ActivityEntry) => {
        const transitionId = entry.id;
        try {
            dispatch(logActivity.stage(entry));
            await simulateAPIRequest();
            dispatch(logActivity.amend(transitionId, { ...entry, id: generateId() }));
            dispatch(logActivity.commit(transitionId));
        } catch (error) {
            dispatch(logActivity.fail(transitionId, error));
        }
    };

    const handleEditActivity = async (entry: ActivityEntry) => {
        const transitionId = entry.id;
        try {
            dispatch(editActivity.stage(entry));
            await simulateAPIRequest();
            dispatch(editActivity.commit(transitionId));
        } catch (error) {
            dispatch(editActivity.fail(transitionId, error));
        }
    };

    const handleDismissActivity = async (entry: ActivityEntry) => {
        const transitionId = entry.id;
        try {
            dispatch(dismissActivity.stage({ id: entry.id }));
            await simulateAPIRequest();
            dispatch(dismissActivity.commit(transitionId));
        } catch (error) {
            dispatch(dismissActivity.stash(transitionId));
        }
    };

    /** Route failed transitions through the correct lifecycle handler on reconnect */
    useAutoRetry((action: StagedAction) => {
        if (createEpic.stage.match(action)) return handleCreateEpic(action.payload);
        if (editEpic.stage.match(action)) return handleEditEpic(action.payload as Epic);
        if (updateProfile.stage.match(action)) return handleUpdateProfile(action.payload);
        if (createProjectTodo.stage.match(action)) return handleCreateProjectTodo(action.payload);
        if (editProjectTodo.stage.match(action)) return handleEditProjectTodo(action.payload as ProjectTodo);
        if (logActivity.stage.match(action)) return handleLogActivity(action.payload);
        if (editActivity.stage.match(action)) return handleEditActivity(action.payload as ActivityEntry);
    });

    return (
        <Layout title="Basic" description={description}>
            <ProfileCard onUpdate={handleUpdateProfile} />
            <div className="grad-h my-1" />
            <TodoApp onCreateTodo={handleCreateEpic} onEditTodo={handleEditEpic} onDeleteTodo={handleDeleteEpic} />
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
            />
            <div className="h-4" />
        </Layout>
    );
};
