export const generateId = (): string => {
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    return Array.from(arr, (val) => val.toString(16).padStart(2, '0')).join('');
};

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const simulateAPIRequest = async (errorRate: number) => {
    await wait(1_000);
    if (Math.random() > errorRate) throw new Error('Something went wrong');
};
