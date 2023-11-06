import type { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTodo, editTodo } from '../lib/actions';
import { selectOptimisticTodoState } from '../lib/selectors';
import { Todo } from '../lib/types';

type Props = { todo: Todo };

export const TodoItem: FC<Props> = ({ todo }) => {
    const dispatch = useDispatch();
    const { optimistic, failed, retry } = useSelector(selectOptimisticTodoState(todo.id));

    const toggleTodo = async () => {
        const update = { ...todo, done: !todo.done, revision: todo.revision + 1 };
        const transitionId = todo.id;
        dispatch(editTodo.stage(transitionId, todo.id, update));
        setTimeout(() => dispatch(editTodo.commit(transitionId, todo.id, update)), 500);
    };

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
                {optimistic && !failed && todo.revision === 0 && (
                    <>
                        <button
                            className="text-orange-600 hover:text-orange-800"
                            onClick={() => dispatch(createTodo.stash(todo.id))}
                        >
                            Stash
                        </button>
                        <button
                            className="text-red-600 hover:text-red-800"
                            onClick={() => dispatch(createTodo.fail(todo.id))}
                        >
                            Fail
                        </button>
                        <button
                            className="text-green-600 hover:text-green-800"
                            onClick={() => dispatch(createTodo.commit(todo.id, todo))}
                        >
                            Commit
                        </button>
                    </>
                )}

                {retry && <button onClick={() => dispatch(retry)}>Retry</button>}
            </div>
        </li>
    );
};
