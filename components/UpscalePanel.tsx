/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface UpscalePanelProps {
  onUpscaleImage: () => void;
  isLoading: boolean;
}

const UpscalePanel: React.FC<UpscalePanelProps> = ({ onUpscaleImage, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-gray-200">Upscale Image</h3>
        <p className="text-sm text-gray-400 text-center max-w-md">
          Use AI to increase image resolution and enhance details. Ideal for improving the quality of smaller or blurry photos.
        </p>
        <button
          onClick={onUpscaleImage}
          disabled={isLoading}
          className="w-full max-w-xs mt-2 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-amber-800 disabled:to-amber-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? 'Processing...' : 'Upscale Image (2x)'}
        </button>
    </div>
  );
};

export default UpscalePanel;
