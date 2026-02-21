import type { FC } from 'react';
import { createRoot } from 'react-dom/client';
import { NavLink, Route, HashRouter as Router, Routes } from 'react-router-dom';

import BasicUsecase from '~usecases/basic';
import { MockApiControls } from '~usecases/lib/components/mocks/MockApiControls';
import { MockApiProvider } from '~usecases/lib/components/mocks/MockApiProvider';
import SagasUsecase from '~usecases/sagas';
import ThunksUsecase from '~usecases/thunks';

import './styles.css';

const usecases = [
    { key: 'Basic', path: '/basic', component: BasicUsecase, desc: 'Component-level async' },
    { key: 'Thunks', path: '/thunks', component: ThunksUsecase, desc: 'Thunk orchestration' },
    { key: 'Sagas', path: '/sagas', component: SagasUsecase, desc: 'Saga-driven lifecycle' },
];

const Home: FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="max-w-sm text-center px-6">
            <h1 className="text-2xl font-bold text-white mb-1">Optimistron</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-8">Optimistic state for Redux</p>

            <div className="text-left text-sm text-gray-400 leading-relaxed space-y-3 mb-8">
                <p>
                    Optimistic state is <span className="text-gray-200">computed, not stored</span>.
                    Only <code className="text-xs text-emerald-400/80 bg-surface-3 px-1 py-0.5 rounded">commit</code> mutates
                    reducer state. All other operations modify the transitions list.
                </p>
                <p>
                    Think <code className="text-xs text-emerald-400/80 bg-surface-3 px-1 py-0.5 rounded">git rebase</code> —
                    committed state is your main branch, transitions are replayed on top at read-time.
                </p>
            </div>

            <div className="p-3 rounded-lg bg-surface-2 border border-border-subtle text-xs text-gray-500 text-left leading-relaxed">
                Pick a usecase from the sidebar. Use the <span className="text-gray-300">Mock API</span> controls
                to simulate network conditions.
            </div>
        </div>
    </div>
);

export const App: FC = () => (
    <MockApiProvider>
        <Router>
            <div className="flex w-full h-screen overflow-hidden">
                <div className="w-64 flex-shrink-0 h-full flex flex-col bg-surface-1 border-r border-border-subtle">
                    <div className="p-4 pb-2">
                        <NavLink to="/" className="block">
                            <h2 className="text-sm font-bold text-white tracking-tight">Optimistron</h2>
                            <span className="text-[10px] text-gray-600 uppercase tracking-widest">demos</span>
                        </NavLink>
                    </div>

                    <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
                        {usecases.map(({ key, path, desc }) => (
                            <NavLink
                                key={key}
                                to={path}
                                className={({ isActive }) =>
                                    `block px-3 py-2 rounded-md text-sm transition-colors ${
                                        isActive
                                            ? 'bg-surface-3 text-white'
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2'
                                    }`
                                }
                            >
                                <span className="block font-medium">{key}</span>
                                <span className="block text-[11px] text-gray-600">{desc}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-border-subtle">
                        <MockApiControls />
                    </div>
                </div>

                <div className="flex flex-col grow h-full overflow-hidden bg-surface-0">
                    <Routes>
                        <Route path="/" Component={Home} />
                        {usecases.map(({ key, path, component }) => (
                            <Route key={key} path={path} Component={component} />
                        ))}
                    </Routes>
                </div>
            </div>
        </Router>
    </MockApiProvider>
);

const el = document.getElementById('root')!;
const root = createRoot(el);
root.render(<App />);
requestAnimationFrame(() => el.classList.add('ready'));
