/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { generateFilteredImage, generateAdjustedImage, generateProductScene, generateColorizedImage, generateRepairedImage, generateColorizedAndRepairedImage, generateTransparentBackground, generateUpscaledImage } from '../services/geminiService';
import Header from './Header';
import Spinner from './Spinner';
import FilterPanel from './FilterPanel';
import AdjustmentPanel from './AdjustmentPanel';
import ProductStudioPanel from './ProductStudioPanel';
import ColorizePanel from './ColorizePanel';
import UpscalePanel from './UpscalePanel';
import { PaletteIcon, SunIcon, StudioIcon, DownloadIcon, UndoIcon, RedoIcon, ColorizeIcon, UpscaleIcon, BackgroundIcon } from './icons';

// Helper to convert data URL to File
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};


// Thumbnail Component
const ImageThumbnail: React.FC<{ item: BatchImage, onDownload: () => void }> = ({ item, onDownload }) => {
    const imageUrl = useMemo(() => item.processed ? URL.createObjectURL(item.processed) : URL.createObjectURL(item.original), [item.original, item.processed]);

    return (
        <div className="relative aspect-square bg-black/20 rounded-lg overflow-hidden border border-gray-700/50 shadow-inner group">
            <img src={imageUrl} alt={item.original.name} className="w-full h-full object-contain" />
            
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ${
                item.status === 'processing' ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'
            }`}>
                {item.status === 'processing' && <Spinner />}
            </div>

            <div className="absolute top-2 right-2">
                {item.status === 'done' && <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">&#10003;</div>}
                {item.status === 'error' && <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white" title={item.error}>!</div>}
            </div>

            {item.status === 'done' && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={onDownload} className="flex items-center gap-2 bg-amber-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-amber-400 active:scale-95 transition-colors">
                        <DownloadIcon className="w-5 h-5" /> Download
                    </button>
                </div>
            )}
        </div>
    );
};


const BatchBackgroundPanel: React.FC<{ onRemoveBackground: () => void, isLoading: boolean, credits: number }> = ({ onRemoveBackground, isLoading, credits }) => {
    const isOutOfCredits = credits <= 0;
    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-gray-200">Remove Background</h3>
            <p className="text-sm text-gray-400 text-center max-w-md">
                Automatically remove the background from all pending images in the batch, leaving the main subject on a transparent background.
            </p>
            <button
                onClick={onRemoveBackground}
                disabled={isLoading || isOutOfCredits}
                className="w-full max-w-xs mt-2 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-amber-800 disabled:to-amber-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                title={isOutOfCredits ? "You are out of credits." : "Remove background from batch"}
            >
                {isLoading ? 'Processing...' : 'Remove Background from Batch'}
            </button>
        </div>
    );
};

// Main Batch Editor Component
type BatchTool = 'filter' | 'adjust' | 'studio' | 'colorize' | 'upscale' | 'background';
type BatchImageStatus = 'pending' | 'processing' | 'done' | 'error';

interface BatchImage {
    id: string;
    original: File;
    processed: File | null;
    status: BatchImageStatus;
    error?: string;
}

interface BatchEditorProps {
    files: File[];
    onExit: () => void;
    credits: number;
    onRefillCredits: () => void;
    onDeductCredits: (amount: number) => void;
    parseErrorMessage: (error: any) => string;
}

const BatchEditor: React.FC<BatchEditorProps> = ({ files, onExit, credits, onRefillCredits, onDeductCredits, parseErrorMessage }) => {
    const [images, setImages] = useState<BatchImage[]>([]);
    const [activeTool, setActiveTool] = useState<BatchTool>('filter');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeRestoration, setActiveRestoration] = useState<string | null>(null);

    useEffect(() => {
        setImages(files.map((file, index) => ({
            id: `${file.name}-${index}-${Date.now()}`,
            original: file,
            processed: null,
            status: 'pending',
        })));
    }, [files]);

    const handleApply = async (operation: string, prompt?: string) => {
        if (isProcessing) return;

        const pendingImages = images.filter(img => img.status === 'pending');
        if (pendingImages.length === 0) return;
        if (credits < pendingImages.length) {
            alert(`You need ${pendingImages.length} credits, but you only have ${credits}. Please refill.`);
            return;
        }

        setIsProcessing(true);
        if (operation.startsWith('colorize') || operation === 'repair') {
            setActiveRestoration(operation);
        }
        onDeductCredits(pendingImages.length);

        let serviceFunction: ((file: File, p: string) => Promise<string>) | ((file: File) => Promise<string>);

        switch (operation) {
            case 'filter': serviceFunction = generateFilteredImage; break;
            case 'adjust': serviceFunction = generateAdjustedImage; break;
            case 'studio': serviceFunction = generateProductScene; break;
            case 'colorize': serviceFunction = generateColorizedImage; break;
            case 'repair': serviceFunction = generateRepairedImage; break;
            case 'colorize_repair': serviceFunction = generateColorizedAndRepairedImage; break;
            case 'upscale': serviceFunction = generateUpscaledImage; break;
            case 'background': serviceFunction = generateTransparentBackground; break;
            default: 
                setIsProcessing(false);
                setActiveRestoration(null);
                return;
        }

        for (const image of pendingImages) {
            setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'processing' } : img));
            try {
                const resultDataUrl = await (prompt 
                    ? (serviceFunction as (file: File, p: string) => Promise<string>)(image.original, prompt) 
                    : (serviceFunction as (file: File) => Promise<string>)(image.original)
                );
                
                const newFile = dataURLtoFile(resultDataUrl, `processed_${image.original.name}`);
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'done', processed: newFile } : img));
            } catch (err) {
                const errorMessage = parseErrorMessage(err);
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', error: errorMessage } : img));
            }
        }

        setIsProcessing(false);
        setActiveRestoration(null);
    };
    
    const downloadImage = (item: BatchImage) => {
        if (!item.processed) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(item.processed);
        link.download = item.processed.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAll = () => {
        const successfulImages = images.filter(img => img.status === 'done');
        successfulImages.forEach(item => {
            downloadImage(item);
        });
    };
    
    const resetBatch = () => {
        setImages(prev => prev.map(img => ({ ...img, processed: null, status: 'pending', error: undefined })));
    }

    const successfulCount = useMemo(() => images.filter(img => img.status === 'done').length, [images]);
    const errorCount = useMemo(() => images.filter(img => img.status === 'error').length, [images]);
    const processingCount = useMemo(() => images.filter(img => img.status === 'processing').length, [images]);
    const progress = successfulCount + errorCount + processingCount;
    
    const tools: { name: BatchTool; label: string; icon: React.FC<{className?: string}>; }[] = [
        { name: 'filter', label: 'Filter', icon: PaletteIcon },
        { name: 'adjust', label: 'Adjust', icon: SunIcon },
        { name: 'studio', label: 'Product Studio', icon: StudioIcon },
        { name: 'colorize', label: 'Revive', icon: ColorizeIcon },
        { name: 'upscale', label: 'Upscale', icon: UpscaleIcon },
        { name: 'background', label: 'BG Remove', icon: BackgroundIcon },
    ];
    
    return (
        <div className="w-full min-h-screen flex flex-col bg-gray-900 text-gray-100">
            <Header credits={credits} onRefillCredits={onRefillCredits} />
            <div className="flex flex-grow overflow-hidden">
                {/* Main Content */}
                <main className="flex-grow flex flex-col p-4 md:p-6 overflow-hidden">
                    <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold">Batch Editor</h2>
                            <p className="text-gray-400">{images.length} images loaded. {isProcessing ? `Processing ${progress}/${images.length}...` : `${successfulCount} processed.`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={resetBatch} disabled={isProcessing} className="flex items-center justify-center gap-2 bg-white/10 text-gray-200 font-semibold py-2.5 px-4 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50">
                                <UndoIcon className="w-5 h-5"/> Reset
                             </button>
                             <button onClick={onExit} disabled={isProcessing} className="bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-md hover:bg-amber-500 transition-colors active:scale-95 disabled:opacity-50">
                                Exit Batch Mode
                             </button>
                        </div>
                    </div>
                    <div className="flex-grow grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4 overflow-y-auto pr-2 -mr-2 py-4">
                        {images.map(item => (
                            <ImageThumbnail key={item.id} item={item} onDownload={() => downloadImage(item)} />
                        ))}
                    </div>
                    <div className="flex-shrink-0 pt-4 border-t border-gray-700 flex items-center justify-end gap-4">
                        {successfulCount > 0 && <span className="text-green-400">{successfulCount} images successful.</span>}
                        {errorCount > 0 && <span className="text-red-400">{errorCount} images failed.</span>}
                        <button onClick={downloadAll} disabled={isProcessing || successfulCount === 0} className="flex items-center gap-2 bg-white/10 text-gray-200 font-semibold py-2.5 px-4 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50">
                            <DownloadIcon className="w-5 h-5"/> Download All
                        </button>
                    </div>
                </main>
                {/* Right Panel */}
                <aside className="w-96 flex-shrink-0 bg-gray-900/50 border-l border-gray-700 p-4 flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-center text-gray-300">Select a Batch Operation</h3>
                     <div className="grid grid-cols-3 gap-2">
                        {tools.map(tool => (
                            <button
                                key={tool.name}
                                onClick={() => setActiveTool(tool.name)}
                                disabled={isProcessing}
                                className={`w-full flex flex-col items-center justify-center gap-2 text-center p-3 rounded-lg text-base transition-colors disabled:opacity-50 ${
                                    activeTool === tool.name ? 'bg-amber-500/20 text-amber-300' : 'text-gray-300 hover:bg-white/10'
                                }`}
                            >
                                <tool.icon className="w-6 h-6"/>
                                {tool.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-grow">
                        {activeTool === 'filter' && <FilterPanel onApplyFilter={(p) => handleApply('filter', p)} isLoading={isProcessing} credits={credits} isBatchMode />}
                        {activeTool === 'adjust' && <AdjustmentPanel onApplyAdjustment={(p) => handleApply('adjust', p)} isLoading={isProcessing} credits={credits} isBatchMode />}
                        {activeTool === 'studio' && <ProductStudioPanel onApplyScene={(p) => handleApply('studio', p)} isLoading={isProcessing} credits={credits} isBatchMode />}
                        {activeTool === 'colorize' && <ColorizePanel 
                            onApplyColorize={() => handleApply('colorize')}
                            onApplyRepair={() => handleApply('repair')}
                            onApplyColorizeAndRepair={() => handleApply('colorize_repair')}
                            isLoading={isProcessing}
                            credits={credits} 
                            isBatchMode
                        />}
                        {activeTool === 'upscale' && <UpscalePanel onUpscaleImage={() => handleApply('upscale')} isLoading={isProcessing} credits={credits} isBatchMode />}
                        {activeTool === 'background' && <BatchBackgroundPanel onRemoveBackground={() => handleApply('background')} isLoading={isProcessing} credits={credits} />}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default BatchEditor;