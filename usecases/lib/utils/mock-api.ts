declare global {
    interface Window {
        __mock_api_online?: boolean;
        __mock_api_timeout?: number;
    }
}

export const getMockApiOnline = () => window.__mock_api_online ?? false;
export const setMockApiOnline = (value: boolean) => (window.__mock_api_online = value);

export const getMockApiTimeout = () => window.__mock_api_timeout ?? 500;
export const setMockApiTimeout = (value: number) => (window.__mock_api_timeout = value);

export const generateId = (): string => {
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    return Array.from(arr, (val) => val.toString(16).padStart(2, '0')).join('');
};

export const simulateAPIRequest = async () => {
    await new Promise((resolve) => setTimeout(resolve, getMockApiTimeout()));
    if (!getMockApiOnline()) throw new Error('Offline ☠️');
};
