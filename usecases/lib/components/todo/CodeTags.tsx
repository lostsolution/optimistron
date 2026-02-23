import type { FC } from 'react';

/** Colored inline-code tags for usecase descriptions — maps to oc-* palette */
const tag =
    (color: string): FC<{ children: string }> =>
    ({ children }) => <code className={`${color} font-mono text-[11px]`}>{children}</code>;

/** Committed state (green) */
export const C = tag('text-oc-stage');
/** Optimistic operations (blue) */
export const O = tag('text-oc-commit');
/** Failed state (pink) */
export const F = tag('text-oc-fail');
/** Conflict state (orange) */
export const X = tag('text-oc-conflict');
