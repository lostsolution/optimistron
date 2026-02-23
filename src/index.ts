export { optimistron } from './optimistron';
export { createTransition, createTransitions, crudPrepare } from './actions';
export {
    selectConflictingTransition,
    selectFailedTransition,
    selectFailedTransitions,
    selectIsConflicting,
    selectIsFailed,
    selectIsOptimistic,
} from './selectors/selectors';
export { listState } from './state/list';
export { recordState, nestedRecordState } from './state/record';
export { singularState } from './state/singular';
export { DedupeMode, Operation, OptimisticMergeResult, isTransition } from './transitions';

export type { HandlerReducer, ReducerConfig } from './reducer';
export type {
    ActionMatcher,
    BoundStateHandler,
    CrudActionMap,
    ListStateOptions,
    NestedRecordStateOptions,
    RecordStateOptions,
    SingularStateOptions,
    StateHandler,
    StringKeys,
    TransitionState,
    VersioningOptions,
} from './state/types';

export type { RecordState as IndexedState, RecursiveRecordState as NestedRecord, PathOf } from './state/record';
export type { TransitionAction, Transition } from './transitions';
