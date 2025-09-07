/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { WandIcon } from './icons';

interface SocialPanelProps {
  onApplySocialPost: () => void;
  onSetAspect: (aspect: number | undefined) => void;
  socialText: string;
  onSocialTextChange: (text: string) => void;
  isLoading: boolean;
  isCropping: boolean;
  onSuggestTitles: () => void;
  isSuggestingTitles: boolean;
  titleSuggestions: string[];
  socialFont: string;
  onSocialFontChange: (font: string) => void;
  socialColor: string;
  onSocialColorChange: (color: string) => void;
  socialShadow: string;
  onSocialShadowChange: (shadow: string) => void;
  socialFontSize: number;
  onSocialFontSizeChange: (size: number) => void;
  credits: number;
}

type AspectRatio = '16:9' | '2:3' | '9:16' | '1:1' | '4:5';

const SocialPanel: React.FC<SocialPanelProps> = ({ 
  onApplySocialPost, 
  onSetAspect, 
  socialText,
  onSocialTextChange,
  isLoading, 
  isCropping,
  onSuggestTitles,
  isSuggestingTitles,
  titleSuggestions,
  socialFont,
  onSocialFontChange,
  socialColor,
  onSocialColorChange,
  socialShadow,
  onSocialShadowChange,
  socialFontSize,
  onSocialFontSizeChange,
  credits
}) => {
  const [activeAspect, setActiveAspect] = useState<AspectRatio | null>(null);
  
  const handleAspectChange = (aspect: AspectRatio, value: number | undefined) => {
    setActiveAspect(aspect);
    onSetAspect(value);
  }

  const templates: { name: string, aspect: AspectRatio, value: number }[] = [
    { name: 'YouTube / Twitter', aspect: '16:9', value: 16 / 9 },
    { name: 'Instagram Story', aspect: '9:16', value: 9 / 16 },
    { name: 'Pinterest Pin', aspect: '2:3', value: 2 / 3 },
    { name: 'Instagram Portrait', aspect: '4:5', value: 4 / 5 },
    { name: 'Instagram Square', aspect: '1:1', value: 1 / 1 },
  ];
  
  const fonts = [
    { name: 'Impact', value: 'Bebas Neue' },
    { name: 'Slab', value: 'Roboto Slab' },
    { name: 'Sans', value: 'Inter' },
    { name: 'Script', value: 'Lobster' },
  ];

  const colors = ['#FFFFFF', '#000000', '#FFC700', '#F91880'];

  const shadows = [
    { name: 'None', value: 'none' },
    { name: 'Subtle', value: '1px 1px 2px rgba(0,0,0,0.5)' },
    { name: 'Strong', value: '2px 2px 4px rgba(0,0,0,0.8)' },
    { name: 'Outline', value: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' },
  ];

  const isOutOfCredits = credits <= 0;

  return (
    <div className="w-full max-h-full overflow-y-auto bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Create a Social Post</h3>
      
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-400">1. Select Template</span>
        <div className="grid grid-cols-3 gap-2">
            {templates.map(({ name, aspect, value }) => (
              <button
                key={name}
                onClick={() => handleAspectChange(aspect, value)}
                disabled={isLoading}
                className={`px-2 py-3 rounded-md text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center text-center ${
                  activeAspect === aspect
                  ? 'bg-amber-600/80 text-white shadow-md shadow-amber-500/10' 
                  : 'bg-white/10 hover:bg-white/20 text-gray-200'
                }`}
              >
                {name}
              </button>
            ))}
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <label htmlFor="social-text" className="text-sm font-medium text-gray-400">2. Add Text Overlay</label>
        <input
          id="social-text"
          type="text"
          value={socialText}
          onChange={(e) => onSocialTextChange(e.target.value)}
          placeholder="Enter a catchy title..."
          className="bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base resize-none"
          disabled={isLoading}
        />
        <button
          onClick={onSuggestTitles}
          disabled={isLoading || isSuggestingTitles || isOutOfCredits}
          className="w-full flex items-center justify-center gap-2 bg-white/10 text-gray-200 font-semibold py-2.5 px-3 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50 text-sm"
          title={isOutOfCredits ? "You are out of credits." : "Suggest titles with AI (1 Credit)"}
        >
          <WandIcon className={`w-5 h-5 ${isSuggestingTitles ? 'animate-pulse' : ''}`} />
          {isSuggestingTitles ? 'Generating...' : 'Suggest Titles with AI'}
        </button>
      </div>

      {titleSuggestions.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 animate-fade-in">
              <h4 className="text-xs font-semibold text-gray-400">Suggestions:</h4>
              <div className="flex flex-wrap gap-2">
                  {titleSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => onSocialTextChange(suggestion)}
                        className="bg-gray-700 text-gray-300 text-xs py-1 px-3 rounded-full hover:bg-amber-600 hover:text-white transition-colors"
                      >
                        {suggestion}
                      </button>
                  ))}
              </div>
          </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-gray-400">3. Customize Text Style</span>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Size</label>
          <div className="flex items-center gap-3">
              <input
                  type="range"
                  min="2"
                  max="12"
                  step="0.1"
                  value={socialFontSize}
                  onChange={(e) => onSocialFontSizeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  aria-label="Font size"
              />
              <span className="text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded-md text-sm">{socialFontSize.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Font</label>
            <div className="grid grid-cols-4 gap-2">
                {fonts.map(font => (
                    <button key={font.name} onClick={() => onSocialFontChange(font.value)} style={{ fontFamily: font.value, fontWeight: font.value === 'Roboto Slab' ? 700 : 400 }} className={`py-2 px-2 rounded-md text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 ${socialFont === font.value ? 'bg-amber-600/80 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200'}`}>
                        {font.name}
                    </button>
                ))}
            </div>
        </div>
        
        <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Color</label>
            <div className="flex items-center gap-2">
                {colors.map(color => (
                    <button key={color} onClick={() => onSocialColorChange(color)} style={{ backgroundColor: color }} className={`w-8 h-8 rounded-full border-2 transition-all ${socialColor.toUpperCase() === color ? 'border-amber-400 scale-110' : 'border-gray-600'}`} aria-label={`Set text color to ${color}`} />
                ))}
                <div className="relative w-8 h-8 rounded-full border-2 border-gray-600 overflow-hidden">
                    <input type="color" value={socialColor} onChange={(e) => onSocialColorChange(e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" aria-label="Choose a custom text color" />
                </div>
            </div>
        </div>
        
        <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Shadow</label>
            <div className="grid grid-cols-4 gap-2">
                {shadows.map(shadow => (
                    <button key={shadow.name} onClick={() => onSocialShadowChange(shadow.value)} className={`py-2 px-2 rounded-md text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 ${socialShadow === shadow.value ? 'bg-amber-600/80 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-200'}`}>
                        {shadow.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <button
        onClick={onApplySocialPost}
        disabled={isLoading || !isCropping}
        className="w-full mt-auto bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-amber-800 disabled:to-amber-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Apply & Create
      </button>
    </div>
  );
};

export default SocialPanel;