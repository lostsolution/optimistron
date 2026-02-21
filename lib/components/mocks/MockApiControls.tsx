import type { FC } from 'react';
import { useMockApi } from '~usecases/lib/components/mocks/MockApiProvider';

export const MockApiControls: FC = () => {
    const mockApi = useMockApi();

    return (
        <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-3">Mock API</h3>
            <div className="space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-400">Online</span>
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={mockApi.online}
                            onChange={mockApi.toggleOnline}
                        />
                        <div className="w-9 h-5 rounded-full bg-surface-3 peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-gray-400 peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </div>
                </label>

                <label className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Latency</span>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            min={0}
                            max={10_000}
                            step={250}
                            value={mockApi.timeout}
                            onChange={(e) => mockApi.setResponseTime(parseInt(e.target.value, 10))}
                            className="w-16 text-right text-xs font-mono text-gray-300 bg-surface-3 border border-border-subtle rounded px-1.5 py-0.5 focus:outline-none focus:border-gray-500"
                        />
                        <span className="text-[10px] text-gray-600">ms</span>
                    </div>
                </label>

                <button
                    onClick={mockApi.sync}
                    className="w-full text-xs text-gray-400 bg-surface-3 hover:bg-surface-2 border border-border-subtle rounded py-1.5 transition-colors"
                >
                    Sync API
                </button>
            </div>
        </div>
    );
};
