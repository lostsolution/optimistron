import type { FC } from 'react';
import { Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, Route, HashRouter as Router, Routes } from 'react-router-dom';

import BasicUsecase from '~usecases/basic';
import { MockApiControls } from '~usecases/lib/components/mocks/MockApiControls';
import { MockApiProvider } from '~usecases/lib/components/mocks/MockApiProvider';
import SagasUsecase from '~usecases/sagas';
import ThunksUsecase from '~usecases/thunks';

import './styles.css';

const usecases = [
    { key: 'Home', path: '/', component: Fragment },
    { key: 'Basic', path: '/basic', component: BasicUsecase },
    { key: 'Thunks', path: '/thunks', component: ThunksUsecase },
    { key: 'Sagas', path: '/sagas', component: SagasUsecase },
];

export const App: FC = () => {
    return (
        <MockApiProvider>
            <Router>
                <div className="flex w-full h-screen">
                    <div className="w-80 bg-gray-200 p-4 h-full flex flex-col shrink-0 justify-between">
                        <h2 className="text-lg font-bold mb-4">Usecases</h2>

                        <ul className="grow">
                            {usecases.map(({ key, path }) => (
                                <li className="cursor-pointer" key={key}>
                                    <Link to={path}>{key}</Link>
                                </li>
                            ))}
                        </ul>

                        <MockApiControls />
                    </div>
                    <div className="flex-1 p-4 flex flex-col max-h-full overflow-auto">
                        <Routes>
                            {usecases.map(({ key, path, component }) => (
                                <Route key={key} path={path} Component={component} />
                            ))}
                        </Routes>
                    </div>
                </div>
            </Router>
        </MockApiProvider>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
