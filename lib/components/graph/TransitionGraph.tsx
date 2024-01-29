import type { Mermaid } from 'mermaid';
import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import type { TransitionAction } from '~transitions';
import { getTransitionMeta } from '~transitions';

import { useTransitionHistory } from '~usecases/lib/components/graph/TransitionHistoryProvider';
import { createTodo, deleteTodo, editTodo } from '~usecases/lib/store/actions';

declare global {
    interface Window {
        mermaid?: Mermaid;
    }
}

const getCommit = (options: { tag?: string; type?: 'HIGHLIGHT' | 'NORMAL' | 'REVERSE' }) => {
    let commit = `\tcommit  type: ${options.type ?? 'NORMAL'}`;
    if (options.tag) commit += ` tag: "${options.tag}"`;
    commit += `\n`;
    return commit;
};

const getTransitionCommit = (action: TransitionAction) => {
    const meta = getTransitionMeta(action);
    const type = meta.failed || meta.conflict ? 'REVERSE' : 'NORMAL';
    const tag = (() => {
        if (createTodo.stage.match(action) || createTodo.commit.match(action)) return 'create';
        if (editTodo.stage.match(action) || editTodo.commit.match(action)) return 'update';
        if (deleteTodo.stage.match(action) || deleteTodo.commit.match(action)) return 'delete';
    })();

    return tag ? getCommit({ tag, type }) : '';
};

const getGraph = () => {
    let graph = 'gitGraph LR:\n';
    graph += getCommit({ tag: 'initial' });
    return graph;
};

export const TransitionGraph: FC = () => {
    const { committed, staged } = useTransitionHistory();
    const reflow = useMemo(() => Math.random(), [committed, staged]);
    const ref = useRef<HTMLPreElement>(null);

    useEffect(() => {
        const { mermaid } = window;
        const el = ref.current!;
        if (el && mermaid) {
            mermaid.initialize({
                theme: 'neutral',
                gitGraph: {
                    mainBranchName: 'state',
                    rotateCommitLabel: false,
                    showCommitLabel: false,
                    showBranches: true,
                },
            });
            let graph = getGraph();
            committed.forEach((transition) => (graph += getTransitionCommit(transition)));
            graph += `\tbranch optimistic\n`;

            staged.forEach((transition) => (graph += getTransitionCommit(transition)));
            if (staged.length > 0) {
                graph += `checkout state\n`;
                graph += `merge optimistic type: HIGHLIGHT\n`;
            }
            mermaid
                .render('transition-graph', graph)
                .then(({ svg }) => (el.innerHTML = svg))
                .then(() => el.scrollIntoView({ block: 'end', inline: 'end', behavior: 'instant' }));
        }
    }, [reflow]);
    return (
        <div className="max-w-full overflow-x-auto">
            <div id="transition-graph" />
            <pre ref={ref} className="min-h-28 flex items-center" />
        </div>
    );
};
