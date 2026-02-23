import type { FC, PropsWithChildren, ReactNode } from 'react';
import { COLORS, TransitionGraph } from '~usecases/lib/components/graph/TransitionGraph';

import { F, O, X } from '~usecases/lib/components/todo/CodeTags';

export type UsecaseDescription = {
    subtitle: string;
    howItWorks: ReactNode[];
};

const tryIt: ReactNode[] = [
    <>
        Add an epic, project task, or activity entry — appears instantly as <O>optimistic</O>.
    </>,
    <>
        Toggle offline, then add or edit items — they <F>fail</F> with a jiggle.
    </>,
    <>
        Toggle back online — <F>failed</F> items auto-retry.
    </>,
    <>
        Click "Sync API" — observe <X>conflict</X> detection when server state diverges.
    </>,
];

type Props = {
    description: UsecaseDescription;
    title: string;
};

export const Layout: FC<PropsWithChildren<Props>> = ({ children, title, description }) => (
    <div className="relative h-full">
        <div className="flex absolute inset-0 bottom-36 overflow-hidden">
            {/* App panel */}
            <div className="w-1/2 h-full overflow-y-auto bg-surface-0">{children}</div>

            <div className="grad-v self-stretch" />

            {/* Description panel */}
            <div className="w-1/2 h-full overflow-y-auto p-4 bg-surface-0">
                <h1 className="text-base font-semibold text-white mb-0.5">{title}</h1>
                <p className="text-[11px] text-gray-500 mb-4">{description.subtitle}</p>

                <section className="mb-3">
                    <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">
                        How it works
                    </h3>
                    <ul className="text-xs text-gray-400 leading-relaxed space-y-0.5">
                        {description.howItWorks.map((item, i) => (
                            <li key={i} className="flex gap-1.5">
                                <span className="text-gray-600 select-none">›</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mb-3">
                    <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1">Try it</h3>
                    <ul className="text-[11px] text-gray-500 leading-relaxed space-y-0.5">
                        {tryIt.map((item, i) => (
                            <li key={i} className="flex gap-1.5 items-start">
                                <span className="text-gray-700 select-none">›</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="flex gap-6">
                    <section>
                        <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1">
                            State handlers
                        </h3>
                        <ul className="text-[9px] font-mono text-gray-600 space-y-px">
                            <li className="flex items-center gap-1">
                                <code className="text-fuchsia-400">singularState</code> profile
                            </li>
                            <li className="flex items-center gap-1">
                                <code className="text-cyan-400">recordState</code> epics
                            </li>
                            <li className="flex items-center gap-1">
                                <code className="text-amber-400">nestedRecordState</code> projects
                            </li>
                            <li className="flex items-center gap-1">
                                <code className="text-green-400">listState</code> activity
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1">
                            Legend
                        </h3>
                        <ul className="text-[9px] font-mono text-gray-600 space-y-px">
                            <li className="flex items-center gap-1">
                                <code className="text-oc-commit/80">optimistic</code> pending
                            </li>
                            <li className="flex items-center gap-1">
                                <code className="text-oc-fail/80">fail</code> error
                            </li>
                            <li className="flex items-center gap-1">
                                <code className="text-oc-stash/80">stash</code> reverted
                            </li>
                            <li className="flex items-center gap-1">
                                <code className="text-oc-conflict/80">conflict</code> diverged
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>

        {/* Transition graph */}
        <div className="absolute bottom-0 inset-x-0 h-36 bg-surface-0 flex flex-col">
            <div className="grad-h" />
            <div className="flex items-center justify-between px-5 pt-2 pb-0.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Transitions</h3>
                <div className="flex gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1" style={{ color: COLORS.state }}>
                        <span className="legend-dot" style={{ background: COLORS.state }} />
                        state
                    </span>
                    <span className="flex items-center gap-1" style={{ color: COLORS.optimistic }}>
                        <span className="legend-dot" style={{ background: COLORS.optimistic }} />
                        optimistic
                    </span>
                    <span className="flex items-center gap-1" style={{ color: COLORS.failed }}>
                        <span className="legend-dot" style={{ background: COLORS.failed }} />
                        failed
                    </span>
                </div>
            </div>
            <div className="px-5 flex-1 flex items-center">
                <TransitionGraph />
            </div>
        </div>
    </div>
);
