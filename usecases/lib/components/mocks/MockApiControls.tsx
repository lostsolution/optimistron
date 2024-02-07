import type { FC } from 'react';
import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';

export const MockApiControls: FC = () => {
    const mockApi = useMockApi();

    return (
        <div>
            <h2 className="text-rg font-bold mb-4">Mock API</h2>
            <ul>
                <li>
                    <label className="flex w-full items-center mb-2 cursor-pointer align-center justify-between">
                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Online</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={mockApi.online}
                                onChange={mockApi.toggleOnline}
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </div>
                    </label>
                </li>
                <li>
                    <label className="w-full flex items-center mb-2 cursor-pointer align-center justify-between">
                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Response time (ms)</span>
                        <input
                            type="number"
                            min={0}
                            max={10_000}
                            step={250}
                            id="api-timeout"
                            value={mockApi.timeout}
                            onChange={(e) => mockApi.setResponseTime(parseInt(e.target.value, 10))}
                            aria-describedby="helper-text-explanation"
                            className="border text-gray-800 text-right text-sm font-semibold bg-transparent focus:outline-none pr-6 block"
                            placeholder="90210"
                            required
                        ></input>
                    </label>
                </li>

                <li>
                    <button
                        onClick={mockApi.sync}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm w-full text-center py-2 px-4 rounded"
                    >
                        Sync API
                    </button>
                </li>
            </ul>
        </div>
    );
};
