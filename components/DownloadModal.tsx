/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (format: 'image/png' | 'image/jpeg', quality?: number) => void;
  imageSrc: string | null;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, onDownload, imageSrc }) => {
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [quality, setQuality] = useState(0.92);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);


  if (!isOpen || !imageSrc) return null;

  const handleDownloadClick = () => {
    onDownload(format, format === 'image/jpeg' ? quality : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
      <div ref={modalRef} className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-6 transform transition-all duration-300 scale-95 opacity-0 animate-scale-in">
        <div className="flex justify-between items-center">
          <h2 id="download-modal-title" className="text-2xl font-bold text-gray-100">Export Image</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none" aria-label="Close">&times;</button>
        </div>
        
        <div className="w-full h-64 bg-black/20 rounded-lg overflow-hidden flex items-center justify-center">
            <img src={imageSrc} alt="Export preview" className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
        </div>

        <fieldset className="flex flex-col gap-4">
            <legend className="font-semibold text-gray-300">Format</legend>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setFormat('image/png')} className={`py-3 px-4 rounded-md font-semibold text-base transition ${format === 'image/png' ? 'bg-amber-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`} aria-pressed={format === 'image/png'}>
                    PNG
                </button>
                <button onClick={() => setFormat('image/jpeg')} className={`py-3 px-4 rounded-md font-semibold text-base transition ${format === 'image/jpeg' ? 'bg-amber-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`} aria-pressed={format === 'image/jpeg'}>
                    JPEG
                </button>
            </div>
        </fieldset>

        {format === 'image/jpeg' && (
             <div className="flex flex-col gap-3 animate-fade-in">
                <div className="flex justify-between items-center">
                    <label htmlFor="quality" className="font-semibold text-gray-300">Quality</label>
                    <span className="text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded-md text-sm">{Math.round(quality * 100)}</span>
                </div>
                <input
                    id="quality"
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.01"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        )}

        <div className="flex justify-end gap-4 mt-2">
            <button onClick={onClose} className="font-semibold py-3 px-6 rounded-lg text-gray-300 bg-white/10 hover:bg-white/20 transition-colors">Cancel</button>
            <button onClick={handleDownloadClick} className="font-bold py-3 px-6 rounded-lg bg-amber-500 text-white hover:bg-amber-400 transition-colors active:scale-95 shadow-md shadow-amber-500/20">
                Download
            </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
