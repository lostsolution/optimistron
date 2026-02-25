/**
 * Internal selectors — not part of the public API.
 *
 * Consumers access these via the `optimistron()` result object. */

import { warn } from '~utils/logger';
import type { BoundReducer } from '~/reducer';
import type { TransitionState } from '~/state/types';
import type { StagedAction } from '~/transitions';
import { getTransitionMeta, toCommit } from '~/transitions';
import type { Maybe } from '~/utils/types';

/** Creates a `selectOptimistic` selector closed over the bound reducer. */
export const createSelectOptimistic =
    <State>(boundReducer: BoundReducer<State>, namespace: string) =>
    <Slice>(selector: (state: TransitionState<State>) => Slice) =>
    (state: TransitionState<State>): Slice => {
        /** Fast-path: no transitions to replay */
        if (!state.transitions.length) return selector(state);

        try {
            const optimisticState = state.transitions.reduce(
                (acc, transition) => {
                    acc.state = boundReducer(acc, toCommit(transition));
                    return acc;
                },
                Object.assign({}, state),
            );

            return selector(optimisticState);
        } catch (error) {
            warn(`selectOptimistic: error replaying transitions for "${namespace}"`, error);
            return selector(state);
        }
    };

/** Returns all failed transitions from the transitions list */
export const selectFailures = <State>({ transitions }: TransitionState<State>): StagedAction[] =>
    transitions.filter((action) => getTransitionMeta(action).failed);

/** Returns a specific failed transition by ID, or `undefined` if not found */
export const selectFailure =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>): Maybe<StagedAction> =>
        transitions.find((action) => {
            const { id, failed } = getTransitionMeta(action);
            return id === transitionId && failed;
        });

/** Returns a specific conflicting transition by ID, or `undefined` if not found */
export const selectConflict =
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
        selectFailure(transitionId)(state) !== undefined;

/** Returns `true` if the transition with the given ID has conflicted with committed state */
export const selectIsConflicting =
    (transitionId: string) =>
    <State>(state: TransitionState<State>): boolean =>
        selectConflict(transitionId)(state) !== undefined;
