/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface FilterPanelProps {
  onApplyFilter: (prompt: string) => void;
  isLoading: boolean;
  credits: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onApplyFilter, isLoading, credits }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.' },
    { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.' },
    { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.' },
    { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.' },
    { name: 'Vintage', prompt: 'Give the image a vintage film look from the 1970s, with slightly faded colors, a warm yellow tint, and subtle film grain.' },
    { name: 'Black & White', prompt: 'Convert the image to a high-contrast, dramatic black and white, emphasizing textures and shadows.' },
    { name: 'Sepia', prompt: 'Apply a classic sepia tone to the image, giving it an old-fashioned, warm brownish monochrome look.' },
    { name: 'Cyberpunk', prompt: 'Transform the image with a futuristic cyberpunk aesthetic, featuring saturated neon blues, purples, and pinks, especially in the highlights and shadows.' },
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
      onApplyFilter(activePrompt);
    }
  };

  const isOutOfCredits = credits <= 0;

  return (
    <div className="w-full max-h-full overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Apply a Filter</h3>
      
      <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading || isOutOfCredits}
            className={`w-full text-center flex items-center justify-center min-h-[4.5rem] bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-amber-500' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <textarea
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe a custom filter (e.g., '80s synthwave glow')"
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-amber-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base resize-none"
        rows={3}
        disabled={isLoading || isOutOfCredits}
      />
      
      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-4 pt-2">
          <button
            onClick={handleApply}
            className="w-full bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-amber-800 disabled:to-amber-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !activePrompt.trim() || isOutOfCredits}
            title={isOutOfCredits ? "You are out of credits." : "Apply this filter"}
          >
            Apply Filter (1 Credit)
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;