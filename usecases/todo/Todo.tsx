import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { TodoList } from './TodoList';
import { store } from './store';

const root = createRoot(document.getElementById('root')!);
root.render(
    <Provider store={store}>
        <TodoList />
    </Provider>,
);
