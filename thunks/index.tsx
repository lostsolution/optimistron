import type { FC } from 'react';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';

import { TransitionHistoryProvider } from '~usecases/lib/components/graph/TransitionHistoryProvider';
import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';
import { createDebugStore } from '~usecases/lib/store/store';
import { App } from '~usecases/thunks/App';

export const { store, eventBus } = createDebugStore(thunk.withExtraArgument({}));

const Usecase: FC = () => {
    const mockApi = useMockApi();
    useEffect(() => mockApi.setStore(store), []);

    return (
        <Provider store={store}>
            <TransitionHistoryProvider eventBus={eventBus}>
                <App />
            </TransitionHistoryProvider>
        </Provider>
    );
};

export default Usecase;
