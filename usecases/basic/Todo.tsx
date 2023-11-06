import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createStore } from '../lib/store';
import { TodoList } from './TodoList';

const root = createRoot(document.getElementById('root')!);
const store = createStore();

root.render(
    <Provider store={store}>
        <TodoList />
    </Provider>,
);
