import { isAction, type Middleware } from 'redux';
import { isTransition, type TransitionAction } from '~transitions';

type TransitionEvent = CustomEvent<TransitionAction>;
type TransitionEventHandler = (event: TransitionEvent) => void;

export type TransitionEventBus = {
    publish: (transition: TransitionAction) => void;
    subscribe: (subscriber: (transition: TransitionAction) => void) => () => void;
};

export const createEventBus = (): TransitionEventBus => {
    const bus = document.createElement('div');
    const eventName = '__OPTIMISTRON_TRANSITION_EVENT__';

    return {
        publish: (transition: TransitionAction) => {
            const event: TransitionEvent = new CustomEvent(eventName, { detail: transition });
            bus.dispatchEvent(event);
        },
        subscribe: (subscriber: (transition: TransitionAction) => void) => {
            const handler: TransitionEventHandler = (event) => subscriber(event.detail);
            bus.addEventListener<any>(eventName, handler);
            return () => bus.removeEventListener<any>(eventName, handler);
        },
    };
};

export const createOptimistronMiddlware = (): [Middleware, TransitionEventBus] => {
    const eventBus = createEventBus();

    return [
        () => (next) => (action) => {
            if (isAction(action) && isTransition(action)) eventBus.publish(action);
            next(action);
        },
        eventBus,
    ];
};
