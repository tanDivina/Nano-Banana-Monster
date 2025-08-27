/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { UploadIcon } from './icons';

interface BackgroundPanelProps {
  onGenerateTransparentBackground: () => void;
  onApplyBackgroundColor: (color: string) => void;
  onApplyBackgroundImage: (file: File) => void;
  isLoading: boolean;
}

const BackgroundPanel: React.FC<BackgroundPanelProps> = ({
  onGenerateTransparentBackground,
  onApplyBackgroundColor,
  onApplyBackgroundImage,
  isLoading,
}) => {
  const [color, setColor] = useState('#ffffff');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };
  
  const handleApplyColor = () => {
    onApplyBackgroundColor(color);
  };
  
  const handleBackgroundImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onApplyBackgroundImage(e.target.files[0]);
    }
    // Reset file input to allow uploading the same file again
    if (e.target) {
        e.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Background Tools</h3>
      
      <div className="flex flex-col gap-2 p-3 bg-black/20 rounded-lg border border-gray-700/50">
        <h4 className="font-semibold text-gray-200">Step 1: Remove Existing Background</h4>
        <p className="text-sm text-gray-400">This prepares your image for a new background.</p>
        <button
          onClick={onGenerateTransparentBackground}
          disabled={isLoading}
          className="w-full bg-white/10 text-gray-200 font-semibold py-3 px-4 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
        >
          Remove Background
        </button>
      </div>
      
      <div className="flex flex-col gap-3 p-3 bg-black/20 rounded-lg border border-gray-700/50">
        <h4 className="font-semibold text-gray-200">Step 2: Add New Background</h4>
        {/* Solid Color Background */}
        <div className="flex flex-col gap-3 mt-2">
            <label className="font-medium text-gray-300">Solid Color</label>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-md overflow-hidden border-2 border-gray-600 flex-shrink-0">
                <input
                  type="color"
                  value={color}
                  onChange={handleColorChange}
                  disabled={isLoading}
                  className="absolute inset-0 w-full h-full cursor-pointer p-0 border-none"
                  style={{ padding: 0, border: 'none' }}
                  aria-label="Select color for background"
                />
              </div>
              <button
                onClick={handleApplyColor}
                disabled={isLoading}
                className="flex-grow bg-white/10 text-gray-200 font-semibold py-3 px-4 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
              >
                Apply Color Background
              </button>
            </div>
        </div>
        
        <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-xs">OR</span>
            <div className="flex-grow border-t border-gray-700"></div>
        </div>

        {/* Image Background */}
        <div className="flex flex-col gap-2">
            <label className="font-medium text-gray-300">From Image</label>
            <button
              onClick={handleUploadClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-white/10 text-gray-200 font-semibold py-3 px-4 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <UploadIcon className="w-5 h-5" />
              Upload Background Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBackgroundImageSelect}
              className="hidden"
              accept="image/*"
              disabled={isLoading}
            />
        </div>
      </div>
    </div>
  );
};

export default BackgroundPanel;
