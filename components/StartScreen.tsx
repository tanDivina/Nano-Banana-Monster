/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, RetouchIcon, PaletteIcon, SunIcon, StackIcon } from './icons';
import BackgroundRemovalTool from './BackgroundRemovalTool';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
  onBatchFileSelect: (files: FileList | null) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect, onBatchFileSelect }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showBackgroundTool, setShowBackgroundTool] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBatchFileSelect(e.target.files);
  };

  return (
    <div 
      className={`w-full max-w-5xl mx-auto text-center p-8 transition-all duration-300 rounded-2xl border-2 ${isDraggingOver ? 'bg-amber-500/10 border-dashed border-amber-400' : 'border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files.length > 1) {
          onBatchFileSelect(e.dataTransfer.files);
        } else {
          onFileSelect(e.dataTransfer.files);
        }
      }}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative group">
          <img src="/edited_image.png" alt="Edited image" className="w-56 h-auto drop-shadow-lg" />
          <button
            onClick={() => setShowBackgroundTool(true)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold rounded-lg"
          >
            Remove Background
          </button>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl md:text-7xl">
          AI-Powered Photo Editing, <span className="text-amber-400">Simplified</span>.
        </h1>
        <p className="max-w-2xl text-lg text-gray-400 md:text-xl">
          Retouch photos, apply creative filters, or make professional adjustments using simple text prompts. No complex tools needed.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <label htmlFor="image-upload-start" className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-amber-600 rounded-full cursor-pointer group hover:bg-amber-500 transition-colors">
                <UploadIcon className="w-6 h-6 mr-3 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110" />
                Upload an Image
            </label>
            <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            
            <label htmlFor="batch-upload-start" className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-200 bg-white/10 rounded-full cursor-pointer group hover:bg-white/20 transition-colors">
                <StackIcon className="w-6 h-6 mr-3 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                Batch Edit Photos
            </label>
            <input id="batch-upload-start" type="file" multiple className="hidden" accept="image/*" onChange={handleBatchFileChange} />
        </div>
        <p className="text-sm text-gray-500 mt-2">or drag and drop file(s)</p>

        <div className="mt-16 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-black/20 p-6 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-full mb-4">
                       <RetouchIcon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-100">Precise Retouching</h3>
                    <p className="mt-2 text-gray-400">Click any point on your image to remove blemishes, change colors, or add elements with pinpoint accuracy.</p>
                </div>
                <div className="bg-black/20 p-6 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-full mb-4">
                       <PaletteIcon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-100">Creative Filters</h3>
                    <p className="mt-2 text-gray-400">Transform photos with artistic styles. From vintage looks to futuristic glows, find or create the perfect filter.</p>
                </div>
                <div className="bg-black/20 p-6 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-full mb-4">
                       <SunIcon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-100">Pro Adjustments</h3>
                    <p className="mt-2 text-gray-400">Enhance lighting, blur backgrounds, or change the mood. Get studio-quality results without complex tools.</p>
                </div>
            </div>
        </div>

      </div>
      
      {showBackgroundTool && (
        <BackgroundRemovalTool onComplete={() => setShowBackgroundTool(false)} />
      )}
    </div>
  );
};

export default StartScreen;