export { optimistron } from './optimistron';
export { createTransition, createTransitions } from './actions';
export {
    selectConflictingTransition,
    selectFailedTransition,
    selectFailedTransitions,
    selectIsConflicting,
    selectIsFailed,
    selectIsOptimistic,
} from './selectors';
export { indexedStateFactory, type IndexedState } from './state/indexed';
export { DedupeMode, Operation, OptimisticMergeResult, isTransition } from './transitions';

export type { HandlerReducer } from './reducer';
export type { BoundStateHandler, StateHandler, StateHandlerOptions, TransitionState } from './state';
export type { TransitionAction, Transition } from './transitions';
