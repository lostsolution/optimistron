import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { createStore } from '../lib/store';
import { TodoList } from './TodoList';
import { rootSaga } from './saga';

const root = createRoot(document.getElementById('root')!);
const sagaMiddleware = createSagaMiddleware();
const store = createStore(sagaMiddleware);
sagaMiddleware.run(rootSaga);

root.render(
    <Provider store={store}>
        <TodoList />
    </Provider>,
);
