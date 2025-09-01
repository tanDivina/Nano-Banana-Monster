/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { generateTransparentBackground } from '../services/geminiService';
import Spinner from './Spinner';

interface BackgroundRemovalToolProps {
  onComplete: () => void;
}

const BackgroundRemovalTool: React.FC<BackgroundRemovalToolProps> = ({ onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRemoveBackground = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Fetch the current mascot image
      const response = await fetch('/edited_image.png');
      const blob = await response.blob();
      const file = new File([blob], 'edited_image.png', { type: 'image/png' });
      
      // Generate transparent background version
      const resultDataUrl = await generateTransparentBackground(file);
      
      // Convert data URL to blob
      const resultResponse = await fetch(resultDataUrl);
      const resultBlob = await resultResponse.blob();
      
      // Download the processed image
      const link = document.createElement('a');
      link.href = URL.createObjectURL(resultBlob);
      link.download = 'edited_image_transparent.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove background');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-gray-100 text-center">Remove Background</h2>
        
        <div className="flex flex-col items-center gap-4">
          <img src="/edited_image.png" alt="Current mascot" className="w-32 h-auto rounded-lg border border-gray-600" />
          
          {!success && !isProcessing && (
            <p className="text-gray-400 text-center">
              Click below to remove the background from your mascot image using AI.
            </p>
          )}
          
          {isProcessing && (
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-gray-400">Processing image...</p>
            </div>
          )}
          
          {success && (
            <div className="text-center">
              <p className="text-green-400 mb-2">✓ Background removed successfully!</p>
              <p className="text-gray-400 text-sm">
                The processed image has been downloaded. Replace your current 
                <code className="bg-gray-700 px-1 rounded mx-1">edited_image.png</code> 
                file with the downloaded version.
              </p>
            </div>
          )}
          
          {error && (
            <p className="text-red-400 text-center">{error}</p>
          )}
        </div>
        
        <div className="flex gap-3">
          {!success && (
            <button
              onClick={handleRemoveBackground}
              disabled={isProcessing}
              className="flex-1 bg-amber-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-500 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Remove Background'}
            </button>
          )}
          
          <button
            onClick={onComplete}
            disabled={isProcessing}
            className="flex-1 bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors active:scale-95 disabled:opacity-50"
          >
            {success ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemovalTool;