import type { Action } from '@reduxjs/toolkit';
import type { FC } from 'react';
import { useMemo } from 'react';

import type { TransitionAction } from '~transitions';
import { getTransitionMeta, isTransition } from '~transitions';

import { useTransitionHistory } from '~usecases/lib/components/graph/TransitionHistoryProvider';
import { createTodo, deleteTodo, editTodo, sync } from '~usecases/lib/store/actions';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Graph palette — keyed by semantic role, hex synced with oc-* Tailwind theme */
export const COLORS = {
    state: '#4ade80',
    optimistic: '#38bdf8',
    failed: '#f472b6',
    conflict: '#fb923c',
    tag: '#6e7681',
    muted: '#484f58',
    faint: '#2d333b',
} as const;

const BRANCH_Y = { state: 28, optimistic: 68 };
const COMMIT_GAP = 60;
const START_X = 110;
const DOT_R = 4;
const LABEL_X = 10;
const TRAIL_PAD = 1;
const MAX_VISIBLE = 5;

const getTag = (action: Action): string | undefined => {
    if (sync.match(action)) return 'sync';
    if (createTodo.stage.match(action) || createTodo.commit.match(action)) return 'create';
    if (editTodo.stage.match(action) || editTodo.commit.match(action)) return 'update';
    if (deleteTodo.stage.match(action) || deleteTodo.commit.match(action)) return 'delete';
};

const getDotColor = (action: Action, branch: 'state' | 'optimistic'): string => {
    if (isTransition(action)) {
        const meta = getTransitionMeta(action);
        if (meta.failed) return COLORS.failed;
        if (meta.conflict) return COLORS.conflict;
    }
    return COLORS[branch];
};

export const TransitionGraph: FC = () => {
    const { committed, staged } = useTransitionHistory();

    const graph = useMemo(() => {
        /** Truncate to MAX_VISIBLE total dots per branch (ellipsis consumes a slot) */
        const committedHasOverflow = committed.length > MAX_VISIBLE - 1;
        const committedSlots = committedHasOverflow ? MAX_VISIBLE - 1 : committed.length;
        const committedOverflow = committed.length - committedSlots;
        const visibleCommitted = committed.slice(-committedSlots);

        const stagedHasOverflow = staged.length > MAX_VISIBLE;
        const stagedSlots = stagedHasOverflow ? MAX_VISIBLE - 1 : staged.length;
        const stagedOverflow = staged.length - stagedSlots;
        const visibleStaged = staged.slice(-stagedSlots);

        /** State: 1 (initial/ellipsis) + visible committed = MAX_VISIBLE max */
        const stateCount = 1 + visibleCommitted.length;
        const optCount = visibleStaged.length + (stagedHasOverflow ? 1 : 0);

        const lastStateX = START_X + (stateCount - 1) * COMMIT_GAP;

        /** Optimistic dots are independent — positioned after state dots */
        const firstOptX = lastStateX + COMMIT_GAP;
        const lastOptX = optCount > 0 ? firstOptX + (optCount - 1) * COMMIT_GAP : firstOptX;

        const mergeX = Math.max(lastStateX, lastOptX) + COMMIT_GAP * TRAIL_PAD;
        const midY = (BRANCH_Y.optimistic + BRANCH_Y.state) / 2;
        const trailEndX = optCount > 0 ? mergeX : lastStateX + COMMIT_GAP;
        const width = (optCount > 0 ? mergeX : trailEndX) + 40;

        /** Merge curve: optimistic branch → state branch */
        const mergePath =
            `M ${lastOptX} ${BRANCH_Y.optimistic} ` +
            `C ${lastOptX + 40} ${BRANCH_Y.optimistic}, ${mergeX - 40} ${midY}, ${mergeX} ${BRANCH_Y.state}`;

        type CommitDot = { x: number; y: number; color: string; tag?: string };
        const dots: CommitDot[] = [];

        /** First state dot: ellipsis when overflow, "initial" otherwise */
        dots.push({
            x: START_X,
            y: BRANCH_Y.state,
            color: committedHasOverflow ? COLORS.muted : COLORS.state,
            tag: committedHasOverflow ? `..${committedOverflow} prior` : 'initial',
        });

        visibleCommitted.forEach((action, i) => {
            dots.push({
                x: START_X + (i + 1) * COMMIT_GAP,
                y: BRANCH_Y.state,
                color: getDotColor(action, 'state'),
                tag: getTag(action),
            });
        });

        /** First optimistic dot: ellipsis when overflow */
        if (stagedHasOverflow) {
            dots.push({
                x: firstOptX,
                y: BRANCH_Y.optimistic,
                color: COLORS.muted,
                tag: `..${stagedOverflow} prior`,
            });
        }

        visibleStaged.forEach((action, i) => {
            const offset = stagedHasOverflow ? 1 : 0;
            dots.push({
                x: firstOptX + (i + offset) * COMMIT_GAP,
                y: BRANCH_Y.optimistic,
                color: getDotColor(action, 'optimistic'),
                tag: getTag(action),
            });
        });

        return {
            width,
            lastStateX,
            firstOptX,
            lastOptX,
            mergeX,
            trailEndX,
            mergePath,
            dots,
            hasStaged: optCount > 0,
        };
    }, [committed, staged]);

    return (
        <div className="max-w-full overflow-x-auto">
            <svg
                viewBox={`0 0 ${graph.width} 90`}
                width={graph.width}
                height={90}
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Branch labels */}
                <text x={LABEL_X} y={BRANCH_Y.state + 4} fill={COLORS.state} fontSize={11} fontFamily={MONO} fontWeight={600}>
                    state
                </text>
                <text x={LABEL_X} y={BRANCH_Y.optimistic + 4} fill={COLORS.optimistic} fontSize={11} fontFamily={MONO} fontWeight={600}>
                    optimistic
                </text>

                {/* State baseline: always-visible dashed gray track */}
                <path
                    d={`M ${START_X} ${BRANCH_Y.state} L ${graph.trailEndX} ${BRANCH_Y.state}`}
                    stroke={COLORS.muted}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeDasharray="4 3"
                    fill="none"
                />

                {/* Optimistic baseline: always-visible faint dashed track */}
                <path
                    d={`M ${START_X} ${BRANCH_Y.optimistic} L ${graph.trailEndX} ${BRANCH_Y.optimistic}`}
                    stroke={COLORS.faint}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeDasharray="4 3"
                    fill="none"
                />

                {/* State branch: solid colored portion */}
                <path
                    d={`M ${START_X} ${BRANCH_Y.state} L ${graph.lastStateX} ${BRANCH_Y.state}`}
                    stroke={COLORS.state}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    fill="none"
                />
                {/* State branch: dashed gray trail to merge point (only when staged exist) */}
                {graph.hasStaged && (
                    <path
                        d={`M ${graph.lastStateX} ${BRANCH_Y.state} L ${graph.mergeX} ${BRANCH_Y.state}`}
                        stroke={COLORS.muted}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeDasharray="4 3"
                        fill="none"
                    />
                )}

                {/* Optimistic branch: solid colored portion (only when staged exist) */}
                {graph.hasStaged && (
                    <path
                        d={`M ${graph.firstOptX} ${BRANCH_Y.optimistic} L ${graph.lastOptX} ${BRANCH_Y.optimistic}`}
                        stroke={COLORS.optimistic}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        fill="none"
                    />
                )}

                {/* Merge curve: dashed gray — the optimistic trail */}
                {graph.hasStaged && (
                    <path
                        d={graph.mergePath}
                        stroke={COLORS.muted}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeDasharray="4 3"
                        fill="none"
                    />
                )}

                {/* Junction dot: blue "optimistic" state at merge landing point */}
                {graph.hasStaged && (
                    <circle cx={graph.mergeX} cy={BRANCH_Y.state} r={DOT_R} fill={COLORS.optimistic} />
                )}

                {/* Commit dots and tags */}
                {graph.dots.map((dot, i) => (
                    <g key={i}>
                        <circle cx={dot.x} cy={dot.y} r={DOT_R} fill={dot.color} />
                        {dot.tag && (
                            <text
                                x={dot.x}
                                y={dot.y - 10}
                                fill={COLORS.tag}
                                fontSize={7}
                                fontFamily={MONO}
                                fontWeight={500}
                                textAnchor="middle"
                            >
                                {dot.tag}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
};
