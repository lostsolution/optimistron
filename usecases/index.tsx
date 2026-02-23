import type { FC } from 'react';
import { createRoot } from 'react-dom/client';
import { NavLink, Route, HashRouter as Router, Routes } from 'react-router-dom';

import BasicUsecase from '~usecases/basic';
import { MockApiControls } from '~usecases/lib/components/mocks/MockApiControls';
import { MockApiProvider } from '~usecases/lib/components/mocks/MockApiProvider';
import { Logo, Stars } from '~usecases/lib/components/todo/Icons';
import SagasUsecase from '~usecases/sagas';
import ThunksUsecase from '~usecases/thunks';

import './styles.css';

const usecases = [
    { key: 'Basic', path: '/basic', component: BasicUsecase, desc: 'Component-level async' },
    { key: 'Thunks', path: '/thunks', component: ThunksUsecase, desc: 'Thunk orchestration' },
    { key: 'Sagas', path: '/sagas', component: SagasUsecase, desc: 'Saga-driven lifecycle' },
];

/** Banner — block letter OPTIMISTRON with gradient + terminal dots + stars */
const BannerSvg: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 160" className="w-full rounded-lg">
        <defs>
            <linearGradient id="bn-title-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="30%" stopColor="#8b5cf6" />
                <stop offset="60%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <linearGradient id="bn-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="bn-tagline-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
        </defs>
        <rect width="850" height="160" rx="12" fill="#0d1117" />
        <rect x="1" y="1" width="848" height="158" rx="11" fill="none" stroke="url(#bn-border-grad)" strokeWidth="1.5" />
        <circle cx="28" cy="20" r="5.5" fill="#ff5f57" />
        <circle cx="46" cy="20" r="5.5" fill="#febc2e" />
        <circle cx="64" cy="20" r="5.5" fill="#28c840" />
        <g fill="url(#bn-title-grad)">
            <text fontFamily="'SFMono-Regular','Consolas','Liberation Mono','Menlo',monospace" fontSize="12.5" xmlSpace="preserve">
                <tspan x="85" y="62"> ██████╗ ██████╗ ████████╗██╗███╗   ███╗██╗███████╗████████╗██████╗  ██████╗ ███╗   ██╗</tspan>
                <tspan x="85" y="76">██╔═══██╗██╔══██╗╚══██╔══╝██║████╗ ████║██║██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗████╗  ██║</tspan>
                <tspan x="85" y="90">██║   ██║██████╔╝   ██║   ██║██╔████╔██║██║███████╗   ██║   ██████╔╝██║   ██║██╔██╗ ██║</tspan>
                <tspan x="85" y="104">██║   ██║██╔═══╝    ██║   ██║██║╚██╔╝██║██║╚════██║   ██║   ██╔══██╗██║   ██║██║╚██╗██║</tspan>
                <tspan x="85" y="118">╚██████╔╝██║        ██║   ██║██║ ╚═╝ ██║██║███████║   ██║   ██║  ██║╚██████╔╝██║ ╚████║</tspan>
                <tspan x="85" y="132"> ╚═════╝ ╚═╝        ╚═╝   ╚═╝╚═╝     ╚═╝╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝</tspan>
            </text>
        </g>
        <text x="22" y="55" fontFamily="monospace" fontSize="12" fill="#38bdf8" opacity="0.45">✦</text>
        <text x="40" y="80" fontFamily="monospace" fontSize="7" fill="#8b5cf6" opacity="0.3">✦</text>
        <text x="15" y="105" fontFamily="monospace" fontSize="5" fill="#d946ef" opacity="0.2">✦</text>
        <text x="55" y="120" fontFamily="monospace" fontSize="9" fill="#06b6d4" opacity="0.25">✦</text>
        <text x="30" y="145" fontFamily="monospace" fontSize="4" fill="#c4b5fd" opacity="0.18">✦</text>
        <text x="68" y="48" fontFamily="monospace" fontSize="6" fill="#67e8f9" opacity="0.2">✦</text>
        <text x="795" y="55" fontFamily="monospace" fontSize="14" fill="#38bdf8" opacity="0.55">✦</text>
        <text x="825" y="80" fontFamily="monospace" fontSize="9" fill="#8b5cf6" opacity="0.35">✦</text>
        <text x="778" y="100" fontFamily="monospace" fontSize="7" fill="#d946ef" opacity="0.25">✦</text>
        <text x="830" y="120" fontFamily="monospace" fontSize="11" fill="#06b6d4" opacity="0.3">✦</text>
        <text x="805" y="148" fontFamily="monospace" fontSize="6" fill="#c4b5fd" opacity="0.2">✦</text>
        <text x="770" y="42" fontFamily="monospace" fontSize="5" fill="#67e8f9" opacity="0.18">✦</text>
        <text x="815" y="45" fontFamily="monospace" fontSize="7" fill="#c4b5fd" opacity="0.2">✦</text>
        <text x="838" y="150" fontFamily="'SFMono-Regular','Consolas','Liberation Mono','Menlo',monospace" fontSize="11" fill="url(#bn-tagline-grad)" opacity="0.5" textAnchor="end">λς</text>
    </svg>
);

/** Lifecycle diagram — stage/commit/amend/fail/stash flow */
const LifecycleSvg: FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 150" className="w-full rounded grad-wrap">
        <defs>
            <linearGradient id="lc-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="lc-tagline-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
        </defs>
        <rect width="850" height="150" rx="12" fill="#0d1117" />
        <rect x="1" y="1" width="848" height="148" rx="11" fill="none" stroke="url(#lc-border-grad)" strokeWidth="1.5" />
        <text fontFamily="'SFMono-Regular','Consolas','Liberation Mono','Menlo',monospace" fontSize="13" xmlSpace="preserve">
            <tspan x="30" y="40" fill="#4ade80">  stage</tspan><tspan fill="#484f58"> ───▶ </tspan><tspan fill="#38bdf8">commit</tspan><tspan fill="#484f58">   ✓  stage optimistically, commit on success</tspan>
            <tspan x="30" y="65" fill="#484f58">    ├──────▶ </tspan><tspan fill="#c4b5fd">amend</tspan><tspan fill="#484f58">    ↻  update staged transition before committing</tspan>
            <tspan x="30" y="90" fill="#484f58">    ├──────▶ </tspan><tspan fill="#f472b6">fail</tspan><tspan fill="#484f58">     ✗  flag as failed — keep for retry/UI feedback</tspan>
            <tspan x="30" y="115" fill="#484f58">    └──────▶ </tspan><tspan fill="#facc15">stash</tspan><tspan fill="#484f58">    ↩  revert — restore trailing if TRAILING dedupe</tspan>
        </text>
        <text x="15" y="68" fontFamily="monospace" fontSize="5" fill="#d946ef" opacity="0.18">✦</text>
        <text x="8" y="100" fontFamily="monospace" fontSize="4" fill="#06b6d4" opacity="0.15">✦</text>
        <text x="795" y="32" fontFamily="monospace" fontSize="12" fill="#38bdf8" opacity="0.5">✦</text>
        <text x="825" y="58" fontFamily="monospace" fontSize="8" fill="#8b5cf6" opacity="0.3">✦</text>
        <text x="778" y="80" fontFamily="monospace" fontSize="6" fill="#d946ef" opacity="0.22">✦</text>
        <text x="830" y="100" fontFamily="monospace" fontSize="10" fill="#06b6d4" opacity="0.28">✦</text>
        <text x="805" y="130" fontFamily="monospace" fontSize="5" fill="#c4b5fd" opacity="0.18">✦</text>
        <text x="770" y="115" fontFamily="monospace" fontSize="4" fill="#67e8f9" opacity="0.15">✦</text>
        <text x="815" y="140" fontFamily="monospace" fontSize="7" fill="#f43f5e" opacity="0.16">✦</text>
        <text x="838" y="142" fontFamily="'SFMono-Regular','Consolas','Liberation Mono','Menlo',monospace" fontSize="11" fill="url(#lc-tagline-grad)" opacity="0.5" textAnchor="end">λς</text>
    </svg>
);

const Home: FC = () => (
    <div className="flex items-center justify-center h-full relative overflow-hidden">
        <Stars />
        <div className="max-w-2xl text-center px-6 relative z-10">
            <div className="mb-6">
                <BannerSvg />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-8">Optimistic state for Redux</p>

            <div className="text-left text-sm text-gray-400 leading-relaxed space-y-3 mb-8">
                <p>
                    This demo is a <span className="text-gray-200">project management app</span> built to showcase Optimistron's
                    four state handlers — each section uses a different state shape with full optimistic CRUD.
                </p>
                <p>
                    <code className="text-[10px] text-fuchsia-400 bg-surface-3 px-1 py-0.5 rounded">singularState</code>{' '}
                    powers the user profile,{' '}
                    <code className="text-[10px] text-amber-400 bg-surface-3 px-1 py-0.5 rounded">nestedRecordState</code>{' '}
                    drives project-grouped tasks,{' '}
                    <code className="text-[10px] text-cyan-400 bg-surface-3 px-1 py-0.5 rounded">recordState</code>{' '}
                    backs the flat epic list, and{' '}
                    <code className="text-[10px] text-green-400 bg-surface-3 px-1 py-0.5 rounded">listState</code>{' '}
                    powers the activity log.
                </p>
            </div>

            <div className="mb-8">
                <LifecycleSvg />
            </div>

            <div className="p-3 rounded-lg bg-surface-3 text-xs text-gray-500 text-left leading-relaxed space-y-2 grad-wrap">
                <p>
                    Pick a usecase from the sidebar. Each one implements the <span className="text-gray-300">same store</span> with
                    a different async pattern — component-level, thunks, or sagas.
                </p>
                <p>
                    Use the <span className="text-gray-300">Mock API</span> controls to toggle offline mode, adjust latency,
                    and trigger a sync to see how Optimistron handles failures, retries, and conflict detection in real-time.
                </p>
            </div>
        </div>
    </div>
);

export const App: FC = () => (
    <MockApiProvider>
        <Router>
            <div className="flex w-full h-screen overflow-hidden">
                <div className="w-64 flex-shrink-0 h-full flex flex-col bg-surface-1">
                    <div className="p-4 pb-2">
                        <NavLink to="/" className="flex items-center gap-1.5">
                            <div>
                                <h2 className="text-sm font-bold text-white tracking-tight">Optimistron</h2>
                                <span className="text-[10px] text-gray-600 uppercase tracking-widest">demos</span>
                            </div>
                            <Logo className="w-5 h-3.5 opacity-50 ml-auto" />
                        </NavLink>
                    </div>
                    <div className="grad-h" />

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

                    <div className="h-36 flex-shrink-0 flex flex-col">
                        <div className="grad-h" />
                        <div className="px-5 pt-2.5 pb-4 flex-1">
                            <MockApiControls />
                        </div>
                    </div>
                </div>

                <div className="grad-v self-stretch" />

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
