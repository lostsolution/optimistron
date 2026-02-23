import { type Action, isAction, type Middleware } from 'redux';

type ActionEvent = CustomEvent<Action>;
type ActionEventHandler = (event: ActionEvent) => void;

export type TransitionEventBus = {
    publish: (action: Action) => void;
    subscribe: (subscriber: (action: Action) => void) => () => void;
};

export const createEventBus = (): TransitionEventBus => {
    const bus = document.createElement('div');
    const eventName = '__OPTIMISTRON_TRANSITION_EVENT__';

    return {
        publish: (action: Action) => {
            const event: ActionEvent = new CustomEvent(eventName, { detail: action });
            bus.dispatchEvent(event);
        },
        subscribe: (subscriber: (action: Action) => void) => {
            const handler: ActionEventHandler = (event) => subscriber(event.detail);
            bus.addEventListener<any>(eventName, handler);
            return () => bus.removeEventListener<any>(eventName, handler);
        },
    };
};

export const createOptimistronMiddlware = (): [Middleware, TransitionEventBus] => {
    const eventBus = createEventBus();

    return [
        () => (next) => (action) => {
            if (isAction(action)) eventBus.publish(action);
            next(action);
        },
        eventBus,
    ];
};
