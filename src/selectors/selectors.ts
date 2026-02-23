import type { TransitionState } from '~/state/types';
import { getTransitionMeta } from '~/transitions';

export const selectFailedTransitions = <State>({ transitions }: TransitionState<State>) =>
    transitions.filter((action) => getTransitionMeta(action).failed);

export const selectFailedTransition =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.find((action) => {
            const { id, failed } = getTransitionMeta(action);
            return id === transitionId && failed;
        });

export const selectConflictingTransition =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.find((action) => {
            const { id, conflict } = getTransitionMeta(action);
            return id === transitionId && conflict;
        });

export const selectIsOptimistic =
    (transitionId: string) =>
    <State>({ transitions }: TransitionState<State>) =>
        transitions.some((action) => getTransitionMeta(action).id === transitionId);

export const selectIsFailed =
    (transitionId: string) =>
    <State>(state: TransitionState<State>) =>
        selectFailedTransition(transitionId)(state) !== undefined;

export const selectIsConflicting =
    (transitionId: string) =>
    <State>(state: TransitionState<State>) =>
        selectConflictingTransition(transitionId)(state) !== undefined;
