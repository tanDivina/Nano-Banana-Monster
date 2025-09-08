/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface ProductStudioPanelProps {
  onApplyScene: (prompt: string) => void;
  isLoading: boolean;
  credits: number;
  isBatchMode?: boolean;
}

const ProductStudioPanel: React.FC<ProductStudioPanelProps> = ({ onApplyScene, isLoading, credits, isBatchMode }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Marble Counter', prompt: 'Place the product on a clean, white marble countertop with soft, bright, natural lighting from the side.' },
    { name: 'Wooden Table', prompt: 'Place the product on a rustic, dark wooden table. The background should be slightly out of focus.' },
    { name: 'Studio Light', prompt: 'Place the product in a professional photo studio with a seamless, light gray background and dramatic studio lighting.' },
    { name: 'Outdoor Garden', prompt: 'Place the product outdoors in a lush garden setting, resting on a flat stone surrounded by green foliage.' },
    { name: 'Beach Sand', prompt: 'Place the product on clean, white beach sand with a soft-focus ocean in the background during golden hour.' },
    { name: 'Minimalist Shelf', prompt: 'Place the product on a floating, light wood shelf against a plain, off-white wall with a small, elegant plant nearby.' },
  ];

  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = () => {
    if (activePrompt) {
        onApplyScene(activePrompt);
    }
  };

  const isOutOfCredits = credits <= 0;

  return (
    <div className="w-full max-h-full overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">AI Product Studio</h3>
      <p className="text-sm text-gray-400 text-center -mt-2">Place your product in a new, AI-generated scene.</p>
      
      <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading || isOutOfCredits}
            className={`w-full text-center flex items-center justify-center min-h-[4.5rem] bg-white/10 border border-transparent text-gray-200 font-semibold py-2 px-3 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/20 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-amber-500' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <textarea
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe a custom scene (e.g., 'on a stack of old books')"
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-amber-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base resize-none placeholder:text-gray-500"
        rows={4}
        disabled={isLoading || isOutOfCredits}
      />

      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
            <button
                onClick={handleApply}
                className="w-full bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-amber-800 disabled:to-amber-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !activePrompt.trim() || isOutOfCredits}
                title={isOutOfCredits ? "You are out of credits." : "Generate this product scene"}
            >
                {isBatchMode ? 'Generate Scene for Batch' : 'Generate Scene (1 Credit)'}
            </button>
        </div>
      )}
    </div>
  );
};

export default ProductStudioPanel;