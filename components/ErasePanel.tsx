/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface ErasePanelProps {
  onApplyErase: (prompt: string) => void;
  isLoading: boolean;
  isSelectionMade: boolean;
  credits: number;
}

const ErasePanel: React.FC<ErasePanelProps> = ({ 
    onApplyErase, 
    isLoading,
    isSelectionMade,
    credits
}) => {
  const [prompt, setPrompt] = useState('');

  const handleApply = () => {
    onApplyErase(prompt);
    setPrompt('');
  };

  const isOutOfCredits = credits <= 0;
  const canApply = (!!prompt.trim() || isSelectionMade) && !isOutOfCredits;

  const helperText = isSelectionMade 
    ? "An area is selected. Refine the removal with a text prompt, or apply to erase the most prominent object."
    : "Select an area to remove an object, or describe a general object to erase from the entire image.";
  
  const placeholderText = isSelectionMade
    ? "Optional: describe object in selection (e.g., 'the blue car')"
    : "e.g., 'the person in red' or 'the car on the left'";

  return (
    <div className="w-full max-h-full overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Erase Object</h3>
      <p className="text-sm text-gray-400 text-center -mt-2 min-h-[2rem]">
        {helperText}
      </p>

      <div className="flex flex-col gap-2 flex-grow">
          <label htmlFor="erase-prompt" className="font-semibold text-gray-300">Object to remove</label>
          <textarea
            id="erase-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholderText}
            className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-amber-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base resize-none placeholder:text-gray-500"
            rows={6}
            disabled={isLoading || isOutOfCredits}
          />
      </div>


      <div className="flex flex-col gap-4 pt-2">
        <button
          onClick={handleApply}
          className="w-full bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-amber-800 disabled:to-amber-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          disabled={isLoading || !canApply}
          title={isOutOfCredits ? "You are out of credits." : "Apply this erase action"}
        >
          Apply Erase (1 Credit)
        </button>
      </div>
    </div>
  );
};

export default ErasePanel;