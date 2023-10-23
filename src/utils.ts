export const generateId = (): string => {
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    return Array.from(arr, (val) => val.toString(16).padStart(2, '0')).join('');
};

type Func<T, R> = (arg: T) => R;

export const memoize = <T, R>(func: Func<T, R>): Func<T, R> => {
    let lastArg: T | null = null;
    let lastResult: R | null = null;

    return (arg: T): R => {
        if (arg === lastArg) return lastResult!;
        const result = func(arg);

        lastArg = arg;
        lastResult = result;
        return result;
    };
};
