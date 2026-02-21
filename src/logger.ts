/** Development-only warning logger. Calls are eliminated
 * by bundlers when `process.env.NODE_ENV === 'production'` */
export const warn = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') console.warn(...args);
};
