import type { FC } from 'react';
import { useSelector } from 'react-redux';
import { getTransitionMeta } from '../../src/actions';
import { createTodo, editTodo } from '../lib/actions';
import { selectOptimisticTodoState } from '../lib/selectors';
import { Todo } from '../lib/types';
import { editTodoThunk, removeTodoThunk, retryTransitionThunk, useThunkDispatch } from './thunk';

type Props = { todo: Todo };

export const TodoItem: FC<Props> = ({ todo }) => {
    const dispatch = useThunkDispatch();
    const { optimistic, failed, retry } = useSelector(selectOptimisticTodoState(todo.id));

    const toggleTodo = () =>
        dispatch(
            editTodoThunk(todo.id, {
                ...todo,
                done: !todo.done,
                revision: todo.revision + 1,
            }),
        );

    const removeTodo = () => dispatch(removeTodoThunk(todo.id));

    return (
        <li className="flex justify-between items-center border p-2 mt-2 gap-4">
            <div>
                <span className="w-5 inline-block mr-2">
                    {optimistic && !failed && <span className="animate-spin inline-block">↻</span>}
                    {failed && <span className="text-red-600 inline-block mr-2">⚠️</span>}
                    {!optimistic && <input type="checkbox" checked={todo.done} onClick={toggleTodo} readOnly />}
                </span>
                <span className={todo.done ? 'line-through' : ''}>{todo.value}</span>
            </div>
            <div className="flex justify-between gap-2">
                {retry && (
                    <>
                        <button
                            onClick={() => dispatch(retryTransitionThunk(retry))}
                            className="text-green-600 hover:text-green-800"
                        >
                            Retry{' '}
                            {(() => {
                                if (createTodo.stage.match(retry)) return 'create';
                                if (editTodo.stage.match(retry)) return 'edit';
                            })()}
                        </button>
                        -
                        <button
                            className="text-orange-600 hover:text-orange-800"
                            onClick={() => {
                                const stash = (() => {
                                    const transitionId = getTransitionMeta(retry).id;
                                    if (createTodo.stage.match(retry)) return createTodo.stash(transitionId);
                                    if (editTodo.stage.match(retry)) return editTodo.stash(transitionId);
                                })();

                                stash && dispatch(stash);
                            }}
                        >
                            Dismiss
                        </button>
                        -
                    </>
                )}
                {!optimistic && (
                    <button onClick={removeTodo} className="text-red-600 hover:text-red-800">
                        Delete
                    </button>
                )}
            </div>
        </li>
    );
};
