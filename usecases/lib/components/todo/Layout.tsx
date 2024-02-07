import type { FC, PropsWithChildren, ReactNode } from 'react';
import { TransitionGraph } from '~usecases/lib/components/graph/TransitionGraph';

type Props = {
    description: ReactNode;
    title: string;
};
export const Layout: FC<PropsWithChildren<Props>> = ({ children, title, description }) => (
    <div className="relative h-full bg-gray-200">
        <div className="flex flex-cols absolute w-full top-0 bottom-44 w-full overflow-hidden">
            <div className="flex-shrink-0 w-1/2 h-full overflow-y-auto bg-gray-100">
                <div className="h-full">{children}</div>
            </div>
            <blockquote className="flex-shrink-0 w-1/2 h-full overflow-y-auto p-4 border-s-4 border-gray-300 bg-gray-50 h-full">
                <h1 className="text-2xl mb-4">{title}</h1>
                <p className="text-sm font-medium leading-relaxed text-gray-900">{description}</p>
            </blockquote>
        </div>

        <div className="absolute bottom-0 w-full p-4 h-44 bg-gray-100 border-t border-gray-300">
            <TransitionGraph />
        </div>
    </div>
);
