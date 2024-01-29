import { useEffect, type FC } from 'react';
import { Provider } from 'react-redux';

import { App } from '~usecases/basic/App';
import { TransitionHistoryProvider } from '~usecases/lib/components/graph/TransitionHistoryProvider';
import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';
import { createDebugStore } from '~usecases/lib/store/store';

const { store, eventBus } = createDebugStore();

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
