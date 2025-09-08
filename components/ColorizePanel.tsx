/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface ColorizePanelProps {
  onApplyColorize: () => void;
  onApplyRepair: () => void;
  onApplyColorizeAndRepair: () => void;
  isLoading: boolean;
  credits: number;
  isBatchMode?: boolean;
}

type Operation = 'colorize' | 'repair' | 'both';

const ColorizePanel: React.FC<ColorizePanelProps> = ({
    onApplyColorize,
    onApplyRepair,
    onApplyColorizeAndRepair,
    isLoading,
    credits,
    isBatchMode
}) => {
    const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
    const isOutOfCredits = credits <= 0;

    const operations: { key: Operation; label: string }[] = [
        { key: 'colorize', label: 'Colorize' },
        { key: 'repair', label: 'Repair' },
        { key: 'both', label: 'Both' },
    ];

    const handleApply = () => {
        if (!selectedOperation || isLoading || isOutOfCredits) return;
        switch (selectedOperation) {
            case 'colorize':
                onApplyColorize();
                break;
            case 'repair':
                onApplyRepair();
                break;
            case 'both':
                onApplyColorizeAndRepair();
                break;
        }
    };

    const getButtonText = () => {
        if (isLoading) return 'Processing...';
        if (!selectedOperation) return 'Select an Operation';

        const baseText = {
            colorize: 'Colorization',
            repair: 'Repair',
            both: 'Color & Repair',
        }[selectedOperation];

        const suffix = isBatchMode ? ' to Batch' : ' (1 Credit)';
        return `Apply ${baseText}${suffix}`;
    };

    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-gray-200">Photo Revive</h3>
            <p className="text-sm text-gray-400 text-center max-w-md">
                Use AI to restore old photos. Add realistic color, repair damage like scratches and tears, or do both.
            </p>

            <div className="w-full max-w-xs mt-2">
                <div className="flex w-full bg-black/20 rounded-lg p-1 border border-gray-700/50">
                    {operations.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setSelectedOperation(key)}
                            disabled={isLoading || isOutOfCredits}
                            className={`w-full font-semibold py-2 px-3 rounded-md text-sm transition-all duration-200 ease-in-out disabled:opacity-50 ${
                                selectedOperation === key
                                    ? 'bg-amber-600 text-white shadow-md'
                                    : 'text-gray-300 hover:bg-white/10'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-xs mt-4">
                <button
                    onClick={handleApply}
                    disabled={isLoading || isOutOfCredits || !selectedOperation}
                    className="w-full bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                    title={isOutOfCredits ? "You are out of credits." : undefined}
                >
                    {getButtonText()}
                </button>
            </div>
        </div>
    );
};

export default ColorizePanel;
