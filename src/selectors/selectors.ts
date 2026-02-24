/**
 * Public transition-level selectors.
 *
 * These selectors only read from the `transitions` list on `TransitionState`.
 * They don't need `selectOptimistic` and work on any `TransitionState<T>`
 * regardless of the state shape. */

import type { TransitionState } from '~/state/types';
import type { StagedAction } from '~/transitions';
import { getTransitionMeta } from '~/transitions';
import type { Maybe } from '~/utils/types';

/** Returns all failed transitions from the transitions list */
export const selectFailedTransitions = <State>({ transitions }: TransitionState<State>): StagedAction[] =>
    transitions.filter((action) => getTransitionMeta(action).failed);

/** Returns a specific failed transition by ID, or `undefined` if not found */
export const selectFailedTransition =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>): Maybe<StagedAction> =>
        transitions.find((action) => {
            const { id, failed } = getTransitionMeta(action);
            return id === transitionId && failed;
        });

/** Returns a specific conflicting transition by ID, or `undefined` if not found */
export const selectConflictingTransition =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>): Maybe<StagedAction> =>
        transitions.find((action) => {
            const { id, conflict } = getTransitionMeta(action);
            return id === transitionId && conflict;
        });

/** Returns `true` if there is a pending transition for the given ID */
export const selectIsOptimistic =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>): boolean =>
        transitions.some((action) => getTransitionMeta(action).id === transitionId);

/** Returns `true` if the transition with the given ID has failed */
export const selectIsFailed =
    (transitionId: string) =>
    <State>(state: TransitionState<State>): boolean =>
        selectFailedTransition(transitionId)(state) !== undefined;

/** Returns `true` if the transition with the given ID has conflicted with committed state */
export const selectIsConflicting =
    (transitionId: string) =>
    <State>(state: TransitionState<State>): boolean =>
        selectConflictingTransition(transitionId)(state) !== undefined;

/** Returns all failed transitions across multiple transition states */
export const selectAllFailedTransitions = (...states: TransitionState<any>[]): StagedAction[] => states.flatMap(selectFailedTransitions);

/** Returns the retry count for a transition, or 0 if not found */
export const selectRetryCount =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>): number => {
        const action = transitions.find((a) => getTransitionMeta(a).id === transitionId);
        return action ? (getTransitionMeta(action).retryCount ?? 0) : 0;
    };
