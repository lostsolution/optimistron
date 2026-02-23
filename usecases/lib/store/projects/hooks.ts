import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { selectOptimisticProjectTodoState } from '~usecases/lib/store/projects/selectors';
import type { ProjectTodo } from '~usecases/lib/store/types';

export const useProjectTodoState = (todo: ProjectTodo) => {
    const state = useSelector(selectOptimisticProjectTodoState(todo.projectId, todo.id));
    const [stashed, setStashed] = useState(false);
    const revision = useRef(todo.revision);

    useEffect(() => {
        setStashed(revision.current > todo.revision);
        revision.current = todo.revision;
    }, [todo.revision]);

    return useMemo(
        () => ({
            conflict: state.conflict,
            failed: state.failed,
            failedAction: state.retry,
            loading: state.optimistic && !state.failed,
            stashed,
        }),
        [state.optimistic, state.retry, state.failed, state.conflict, stashed],
    );
};
