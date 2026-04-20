import type { FC } from 'react';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';

import { App } from '~usecases/App';
import { TransitionHistoryProvider } from '~usecases/lib/components/graph/TransitionHistoryProvider';
import { MockApiControls } from '~usecases/lib/components/mocks/MockApiControls';
import { MockApiProvider, useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';
import { Logo } from '~usecases/lib/components/todo/Icons';
import { createDebugStore } from '~usecases/lib/store/store';
import { rootSaga } from '~usecases/saga';

import './styles.css';

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

export const Root: FC = () => (
    <MockApiProvider>
        <div className="flex w-full h-screen overflow-hidden">
            <div className="w-64 flex-shrink-0 h-full flex flex-col bg-surface-1">
                <div className="p-4 pb-2 flex items-center gap-1.5">
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-tight">Optimistron</h2>
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest">sagas demo</span>
                    </div>
                    <Logo className="w-5 h-3.5 opacity-50 ml-auto" />
                </div>
                <div className="grad-h" />

                <div className="flex-1" />

                <div className="h-36 flex-shrink-0 flex flex-col">
                    <div className="grad-h" />
                    <div className="px-5 pt-2.5 pb-4 flex-1">
                        <MockApiControls />
                    </div>
                </div>
            </div>

            <div className="grad-v self-stretch" />

            <div className="flex flex-col grow h-full overflow-hidden bg-surface-0">
                <Usecase />
            </div>
        </div>
    </MockApiProvider>
);

const el = document.getElementById('root')!;
const root = createRoot(el);
root.render(<Root />);
requestAnimationFrame(() => el.classList.add('ready'));
