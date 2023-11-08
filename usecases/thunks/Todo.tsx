import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { TodoList } from './TodoList';
import { thunkStore } from './thunk';

const root = createRoot(document.getElementById('root')!);

root.render(
    <Provider store={thunkStore}>
        <TodoList />
    </Provider>,
);
