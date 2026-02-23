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
    StateHandler,
    TransitionState,
    VersioningOptions,
    WiredStateHandler,
} from './state/types';

export type { RecordStateOptions, NestedRecordStateOptions } from './state/record';
export type { SingularStateOptions } from './state/singular';
export type { ListStateOptions } from './state/list';
export type { StringKeys, PathMap as PathIds, MaybeNull } from './utils/types';

export type { RecordState as IndexedState, RecursiveRecordState as NestedRecord, PathOf } from './state/record';
export type { TransitionAction, Transition } from './transitions';
