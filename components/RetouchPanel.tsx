/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { UploadIcon, CloseIcon } from './icons';

interface RetouchPanelProps {
  onApplyRetouch: (prompt: string) => void;
  isLoading: boolean;
  radius: number;
  onRadiusChange: (radius: number) => void;
  isHotspotSet: boolean;
  referenceImage: File | null;
  onReferenceImageChange: (file: File | null) => void;
  credits: number;
}

const RetouchPanel: React.FC<RetouchPanelProps> = ({ 
    onApplyRetouch, 
    isLoading,
    radius,
    onRadiusChange,
    isHotspotSet,
    referenceImage,
    onReferenceImageChange,
    credits
}) => {
  const [prompt, setPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApply = () => {
    onApplyRetouch(prompt);
    setPrompt('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onReferenceImageChange(e.target.files[0]);
    }
    if (e.target) e.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const referenceImageUrl = referenceImage ? URL.createObjectURL(referenceImage) : null;

  const isOutOfCredits = credits <= 0;
  const canApply = (!!prompt.trim() || !!referenceImage) && !isOutOfCredits;

  // Dynamic helper text based on user input
  const getHelperText = () => {
    const hasReference = !!referenceImage;
    const hasPrompt = !!prompt.trim();

    if (hasReference && !hasPrompt) {
        return (
            <>
                <strong className="block font-semibold text-amber-400">Content Replacement Mode</strong>
                <span>The reference image's content will be integrated into your photo.</span>
            </>
        );
    }
    if (hasReference && hasPrompt) {
        return (
            <>
                <strong className="block font-semibold text-amber-400">Style Transfer Mode</strong>
                <span>The reference image inspires the style; your text guides the edit.</span>
            </>
        );
    }
    if (isHotspotSet) {
        return <span>Describe your edit for the selected area.</span>;
    }
    return <span>Describe a change for the whole image, or click it for a precise edit.</span>;
  };


  return (
    <div className="w-full max-h-full overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Precise Retouching</h3>
      <div className="text-sm text-gray-400 text-center -mt-2 min-h-[3rem] flex flex-col items-center justify-center">
        {getHelperText()}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <label htmlFor="radius-slider" className={`font-semibold transition-opacity ${isHotspotSet ? 'text-gray-300' : 'text-gray-500'}`}>Edit Area Size</label>
            <span className="text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded-md text-sm">{radius}px</span>
        </div>
        <input
            id="radius-slider"
            type="range"
            min="10"
            max="200"
            step="1"
            value={radius}
            onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
            disabled={isLoading || !isHotspotSet || isOutOfCredits}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-4">
        {/* Reference Image Uploader */}
        <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-300">Reference Image (Optional)</label>
            <div className="relative aspect-square w-full bg-black/20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                {referenceImageUrl ? (
                    <>
                        <img src={referenceImageUrl} alt="Reference preview" className="object-contain max-w-full max-h-full rounded" />
                        <button 
                            onClick={() => onReferenceImageChange(null)}
                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/80 transition-colors"
                            aria-label="Remove reference image"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <button onClick={handleUploadClick} disabled={isLoading || isOutOfCredits} className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors p-4">
                        <UploadIcon className="w-8 h-8"/>
                        <span className="text-xs text-center">Click to upload</span>
                    </button>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    disabled={isLoading || isOutOfCredits}
                />
            </div>
        </div>
        
        {/* Text Prompt */}
        <div className="flex flex-col gap-2">
            <label htmlFor="retouch-prompt" className="font-semibold text-gray-300">Text Prompt (Optional)</label>
            <textarea
              id="retouch-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'add sunglasses' or 'make the cat smaller'"
              className="bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-amber-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base resize-none placeholder:text-gray-500"
              rows={4}
              disabled={isLoading || isOutOfCredits}
            />
        </div>
      </div>


      <div className="flex flex-col gap-4 pt-2">
        <button
          onClick={handleApply}
          className="w-full bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-amber-800 disabled:to-amber-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          disabled={isLoading || !canApply}
          title={isOutOfCredits ? "You are out of credits." : "Apply this retouch"}
        >
          Apply Retouch (1 Credit)
        </button>
      </div>
    </div>
  );
};

export default RetouchPanel;