import type { FC } from 'react';
import { Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { NavLink, Route, HashRouter as Router, Routes } from 'react-router-dom';

import BasicUsecase from '~usecases/basic';
import { MockApiControls } from '~usecases/lib/components/mocks/MockApiControls';
import { MockApiProvider } from '~usecases/lib/components/mocks/MockApiProvider';
import SagasUsecase from '~usecases/sagas';
import ThunksUsecase from '~usecases/thunks';

import './styles.css';

const usecases = [
    { key: 'Home', path: '/', component: Fragment },
    { key: 'Basic', path: '/basic', component: BasicUsecase },
    { key: 'Sagas', path: '/sagas', component: SagasUsecase },
    { key: 'Thunks', path: '/thunks', component: ThunksUsecase },
];

export const App: FC = () => {
    return (
        <MockApiProvider>
            <Router>
                <div className="flex w-full h-screen overflow-hidden">
                    <div className="w-72 h-full overflow-hidden">
                        <div className="relative h-full bg-gray-200">
                            <div className="absolute top-0 bottom-44 w-full overflow-y-auto p-4">
                                <h2 className="text-lg font-bold mb-4">Usecases</h2>
                                <ul className="grow mb-4">
                                    {usecases.map(({ key, path }) => (
                                        <li className="cursor-pointer" key={key}>
                                            <NavLink
                                                to={path}
                                                className={(props) => (props.isActive ? 'font-bold' : '')}
                                            >
                                                {key}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="absolute bottom-0 w-full h-44 p-4">
                                <MockApiControls />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col grow h-full overflow-hidden">
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
