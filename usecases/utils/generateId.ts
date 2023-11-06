export const generateId = (): string => {
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    return Array.from(arr, (val) => val.toString(16).padStart(2, '0')).join('');
};
