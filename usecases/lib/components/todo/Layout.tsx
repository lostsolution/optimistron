import type { FC, PropsWithChildren, ReactNode } from 'react';
import { GRAPH_COLORS, TransitionGraph } from '~usecases/lib/components/graph/TransitionGraph';

export type UsecaseDescription = {
    subtitle: string;
    howItWorks: ReactNode[];
    tryIt: ReactNode[];
};

type Props = {
    description: UsecaseDescription;
    title: string;
};

export const Layout: FC<PropsWithChildren<Props>> = ({ children, title, description }) => (
    <div className="relative h-full">
        <div className="flex absolute inset-0 bottom-48 overflow-hidden">
            {/* Todo app panel */}
            <div className="w-1/2 h-full overflow-y-auto bg-surface-1 border-r border-border-subtle">
                {children}
            </div>

            {/* Description panel */}
            <div className="w-1/2 h-full overflow-y-auto p-5 bg-surface-0">
                <h1 className="text-lg font-semibold text-white mb-0.5">{title}</h1>
                <p className="text-xs text-gray-500 mb-5">{description.subtitle}</p>

                <section className="mb-5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">How it works</h3>
                    <ul className="text-sm text-gray-400 leading-relaxed space-y-1">
                        {description.howItWorks.map((item, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="text-gray-600 select-none">›</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mb-4">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Try it</h3>
                    <ul className="text-xs text-gray-500 leading-relaxed space-y-0.5">
                        {description.tryIt.map((item, i) => (
                            <li key={i} className="flex gap-1.5 items-start">
                                <span className="text-gray-700 select-none">›</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <ul className="text-[10px] font-mono text-gray-600 space-y-0.5">
                    <li className="flex items-center gap-1"><code className="text-blue-400">optimistic</code> pending</li>
                    <li className="flex items-center gap-1"><code className="text-amber-400">fail</code> error</li>
                    <li className="flex items-center gap-1"><code className="text-purple-400">stash</code> reverted</li>
                    <li className="flex items-center gap-1"><code className="text-red-400">conflict</code> diverged</li>
                </ul>
            </div>
        </div>

        {/* Transition graph */}
        <div className="absolute bottom-0 inset-x-0 h-48 bg-surface-1 border-t border-border-subtle">
            <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
                <h3 className="text-[10px] font-medium uppercase tracking-widest text-gray-600">Transitions</h3>
                <div className="flex gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1" style={{ color: GRAPH_COLORS.committed }}>
                        <span className="legend-dot" style={{ background: GRAPH_COLORS.committed }} />
                        state
                    </span>
                    <span className="flex items-center gap-1" style={{ color: GRAPH_COLORS.optimistic }}>
                        <span className="legend-dot" style={{ background: GRAPH_COLORS.optimistic }} />
                        optimistic
                    </span>
                    <span className="flex items-center gap-1" style={{ color: GRAPH_COLORS.failed }}>
                        <span className="legend-dot" style={{ background: GRAPH_COLORS.failed }} />
                        failed
                    </span>
                </div>
            </div>
            <div className="px-4">
                <TransitionGraph />
            </div>
        </div>
    </div>
);
