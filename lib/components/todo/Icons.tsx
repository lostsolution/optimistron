import type { FC } from 'react';

/** Brand mark — λς with cyan→lavender gradient, matching SVG tagline-grad */
export const Logo: FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 14" className={className}>
        <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
        </defs>
        <text x="0" y="12" fontFamily="'SFMono-Regular','Consolas','Liberation Mono','Menlo',monospace" fontSize="13" fill="url(#logo-grad)">λς</text>
    </svg>
);

/** Scattered ✦ stars — positioned absolute inside a relative parent */
const STARS: { x: string; y: string; size: number; color: string; opacity: number }[] = [
    { x: '8%', y: '15%', size: 10, color: '#38bdf8', opacity: 0.45 },
    { x: '88%', y: '20%', size: 14, color: '#38bdf8', opacity: 0.5 },
    { x: '92%', y: '55%', size: 8, color: '#8b5cf6', opacity: 0.3 },
    { x: '5%', y: '70%', size: 6, color: '#d946ef', opacity: 0.2 },
    { x: '85%', y: '80%', size: 10, color: '#06b6d4', opacity: 0.28 },
    { x: '15%', y: '90%', size: 5, color: '#c4b5fd', opacity: 0.18 },
    { x: '95%', y: '90%', size: 7, color: '#f43f5e', opacity: 0.16 },
    { x: '50%', y: '5%', size: 5, color: '#67e8f9', opacity: 0.18 },
];

export const Stars: FC = () => (
    <>
        {STARS.map(({ x, y, size, color, opacity }, i) => (
            <span
                key={i}
                className="absolute pointer-events-none select-none"
                style={{ left: x, top: y, fontSize: size, color, opacity, fontFamily: 'monospace' }}
            >
                ✦
            </span>
        ))}
    </>
);

export const Spinner: FC = () => (
    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="currentColor">
        <path
            opacity="0.2"
            fill="currentColor"
            d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946
    s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634
    c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"
        />
        <path
            fill="currentColor"
            d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0
    C22.32,8.481,24.301,9.057,26.013,10.047z"
        >
            <animateTransform
                attributeType="xml"
                attributeName="transform"
                type="rotate"
                from="0 20 20"
                to="360 20 20"
                dur="0.5s"
                repeatCount="indefinite"
            />
        </path>
    </svg>
);

export const CheckMark: FC = () => (
    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path
            fill="currentColor"
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
        />
    </svg>
);

export const Cross: FC = () => (
    <svg className="w-4 h-4" viewBox="0 0 93.934 93.934" xmlns="http://www.w3.org/2000/svg">
        <path
            fill="currentColor"
            d="M80.178,13.757c-18.341-18.342-48.08-18.342-66.421,0c-18.342,18.341-18.342,48.08,0,66.421
		c18.341,18.342,48.08,18.342,66.421,0C98.52,61.836,98.52,32.098,80.178,13.757z M71.576,61.737l-9.838,9.838l-14.771-14.77
		l-14.771,14.77l-9.838-9.838l14.77-14.771l-14.77-14.771l9.838-9.838l14.771,14.771l14.771-14.771l9.838,9.838l-14.77,14.772
		L71.576,61.737z"
        />
    </svg>
);
