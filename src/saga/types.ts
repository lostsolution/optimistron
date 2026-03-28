import type { Action } from '@reduxjs/toolkit';

import type { StagedAction } from '../core/transitions';

/** The shape returned by `createTransitions` — matches the action map
 * that `watchTransition` and `processTransition` operate on. */
export type TransitionActions<P = any> = {
    stage: { match: (action: Action) => action is StagedAction<P> };
    amend: (transitionId: string, ...args: any[]) => Action;
    commit: (transitionId: string) => Action;
    fail: (transitionId: string, error: unknown) => Action;
    stash: (transitionId: string) => Action;
};

export type TransitionSagaOptions<P, R = unknown> = {
    /** Transform before commit. Return value is passed to `amend()`.
     *  If omitted, commits directly without amending. */
    amend?: (payload: P, result: R) => P;
};
