import { clsx } from 'clsx';
import { type FC, useState } from 'react';
import { useSelector } from 'react-redux';

import { Spinner, Cross, CheckMark } from '~usecases/lib/components/todo/Icons';
import { useProjectTodoState } from '~usecases/lib/store/projects/hooks';
import { selectOptimisticProjectTodos } from '~usecases/lib/store/projects/selectors';
import type { ProjectTodo } from '~usecases/lib/store/types';
import { generateId } from '~usecases/lib/utils/mock-api';

const PROJECT_IDS = ['frontend', 'backend', 'design'] as const;
const PROJECT_LABELS: Record<string, string> = {
    frontend: 'Frontend',
    backend: 'Backend',
    design: 'Design',
};

type ProjectTodoItemProps = {
    todo: ProjectTodo;
    onEdit: (todo: ProjectTodo) => void;
    onDelete: (todo: ProjectTodo) => void;
};

const ProjectTodoItem: FC<ProjectTodoItemProps> = ({ todo, onEdit, onDelete }) => {
    const { loading, failed, conflict, stashed } = useProjectTodoState(todo);
    const error = failed || conflict;

    return (
        <div className={clsx('flex items-center gap-1.5 px-1.5 py-0.5 rounded group', loading && 'opacity-70')}>
            <button
                onClick={() => !loading && onEdit({ ...todo, done: !todo.done, revision: todo.revision + 1 })}
                className={clsx(
                    'flex items-center justify-center w-3.5 h-3.5 border rounded-full flex-shrink-0 transition-colors',
                    todo.done
                        ? 'bg-oc-stage/90 border-oc-stage/90 text-white'
                        : 'border-gray-600 text-transparent hover:border-gray-400',
                    failed && !conflict && '!border-oc-fail/80 !bg-oc-fail/30',
                    conflict && '!border-oc-conflict/80 !bg-oc-conflict/30',
                    loading && '!border-gray-600 !bg-transparent !text-gray-500',
                )}
            >
                {loading ? <Spinner /> : <CheckMark />}
            </button>

            <span
                className={clsx(
                    'flex-1 text-[11px] truncate',
                    todo.done && 'line-through text-gray-600',
                    !todo.done && !error && !loading && 'text-gray-300',
                    loading && 'text-oc-commit/60',
                    failed && !conflict && 'text-oc-fail/80 jiggle',
                    conflict && 'text-oc-conflict/80 jiggle',
                    stashed && !failed && 'text-oc-stash/80 jiggle',
                )}
            >
                {todo.value}
            </span>

            <code className="text-[7px] font-mono leading-none flex-shrink-0">
                {loading && <span className="text-oc-commit/60">opt</span>}
                {failed && !conflict && <span className="text-oc-fail/80">fail</span>}
                {conflict && <span className="text-oc-conflict/80">conflict</span>}
                {stashed && <span className="text-oc-stash/80">stash</span>}
            </code>

            <button
                onClick={() => onDelete(todo)}
                className="text-gray-700 hover:text-oc-fail transition-colors opacity-0 group-hover:opacity-100"
            >
                <Cross />
            </button>
        </div>
    );
};

type ProjectColumnProps = {
    projectId: string;
    onCreateTodo: (todo: ProjectTodo) => void;
    onEditTodo: (todo: ProjectTodo) => void;
    onDeleteTodo: (todo: ProjectTodo) => void;
};

const ProjectColumn: FC<ProjectColumnProps> = ({ projectId, onCreateTodo, onEditTodo, onDeleteTodo }) => {
    const todos = useSelector(selectOptimisticProjectTodos(projectId));
    const [value, setValue] = useState('');

    const handleAdd = () => {
        const sanitized = value.trim();
        if (sanitized) {
            onCreateTodo({
                id: generateId(),
                projectId,
                value: sanitized,
                done: false,
                revision: 0,
                createdAt: Date.now(),
            });
            setValue('');
        }
    };

    return (
        <div className="flex-1 min-w-0 border border-border-subtle rounded-lg bg-surface-1 overflow-hidden">
            <div className="px-2 py-1.5 border-b border-border-subtle">
                <h4 className="text-[11px] font-medium text-gray-300">{PROJECT_LABELS[projectId] ?? projectId}</h4>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border-subtle">
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyUp={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-1 text-[11px] text-gray-300 bg-transparent focus:outline-none placeholder:text-gray-700 placeholder:italic"
                    type="text"
                    placeholder="Add item..."
                />
            </div>

            <div className="py-1">
                {todos.map((todo) => (
                    <ProjectTodoItem key={todo.id} todo={todo} onEdit={onEditTodo} onDelete={onDeleteTodo} />
                ))}
                {todos.length === 0 && <p className="px-3 py-2 text-[10px] text-gray-700 italic">No items</p>}
            </div>
        </div>
    );
};

type Props = {
    onCreateTodo: (todo: ProjectTodo) => void;
    onEditTodo: (todo: ProjectTodo) => void;
    onDeleteTodo: (todo: ProjectTodo) => void;
};

export const ProjectBoard: FC<Props> = ({ onCreateTodo, onEditTodo, onDeleteTodo }) => (
    <div className="pb-3">
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Projects</h3>
            <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">
                nestedRecordState
            </span>
        </div>

        <div className="flex gap-1.5 px-3">
            {PROJECT_IDS.map((projectId) => (
                <ProjectColumn
                    key={projectId}
                    projectId={projectId}
                    onCreateTodo={onCreateTodo}
                    onEditTodo={onEditTodo}
                    onDeleteTodo={onDeleteTodo}
                />
            ))}
        </div>
    </div>
);
