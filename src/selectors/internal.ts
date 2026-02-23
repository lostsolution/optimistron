import { warn } from '~/logger';
import type { BoundReducer } from '~/reducer';
import type { TransitionState } from '~/state/types';
import { toCommit } from '~/transitions';

/** Creates a `selectOptimistic` selector closed over the bound reducer.
 * Used internally by `optimistron()` — not part of the public API. */
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
