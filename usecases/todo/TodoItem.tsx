import { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsFailed, selectIsOptimistic } from '../../src/selectors';
import { State, Todo, createTodo } from './store';

type Props = { todo: Todo };

export const TodoItem: FC<Props> = ({ todo }) => {
    const optimistic = useSelector((state: State) => selectIsOptimistic(todo.id)(state.todos));
    const failed = useSelector((state: State) => selectIsFailed(todo.id)(state.todos));

    const dispatch = useDispatch();

    return (
        <li className="flex justify-between items-center border p-2 mt-2">
            {todo.value} {optimistic && <>[optimistic]</>}
            {optimistic && !failed && (
                <>
                    <button
                        className="text-red-600 hover:text-red-800"
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
                </>
            )}
            {failed && (
                <>
                    <button onClick={() => dispatch(createTodo.stage(todo.id, todo))}>Retry</button>
                </>
            )}
        </li>
    );
};
