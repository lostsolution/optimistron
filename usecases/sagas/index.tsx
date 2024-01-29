import type { FC } from 'react';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';

import { useEffect } from 'react';

import { TransitionHistoryProvider } from '~usecases/lib/components/graph/TransitionHistoryProvider';
import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';
import { createDebugStore } from '~usecases/lib/store/store';
import { App } from '~usecases/sagas/App';
import { rootSaga } from '~usecases/sagas/saga';

const sagaMiddleware = createSagaMiddleware();
const { store, eventBus } = createDebugStore(sagaMiddleware);
sagaMiddleware.run(rootSaga);

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
