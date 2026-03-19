import React from 'react';

export const AudioSynthesizerIcon = ({ className }: { className?: string }) => {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <rect x="5" y="10" width="3" height="8" rx="1.5" fill="currentColor">
                <animate
                    attributeName="height"
                    values="8; 4; 16; 8"
                    dur="1s"
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="y"
                    values="10; 14; 2; 10"
                    dur="1s"
                    repeatCount="indefinite"
                />
            </rect>
            <rect x="10.5" y="4" width="3" height="18" rx="1.5" fill="currentColor">
                <animate
                    attributeName="height"
                    values="18; 8; 20; 18"
                    dur="1.2s"
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="y"
                    values="4; 14; 2; 4"
                    dur="1.2s"
                    repeatCount="indefinite"
                />
            </rect>
            <rect x="16" y="8" width="3" height="12" rx="1.5" fill="currentColor">
                <animate
                    attributeName="height"
                    values="12; 20; 6; 12"
                    dur="0.8s"
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="y"
                    values="8; 0; 14; 8"
                    dur="0.8s"
                    repeatCount="indefinite"
                />
            </rect>
        </svg>
    );
};
