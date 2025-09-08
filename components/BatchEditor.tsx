/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { generateFilteredImage, generateAdjustedImage, generateProductScene } from '../services/geminiService';
import Header from './Header';
import Spinner from './Spinner';
import FilterPanel from './FilterPanel';
import AdjustmentPanel from './AdjustmentPanel';
import ProductStudioPanel from './ProductStudioPanel';
import { PaletteIcon, SunIcon, StudioIcon, DownloadIcon, UndoIcon, RedoIcon } from './icons';

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

// Main Batch Editor Component
type BatchTool = 'filter' | 'adjust' | 'studio';
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

    useEffect(() => {
        setImages(files.map((file, index) => ({
            id: `${file.name}-${index}-${Date.now()}`,
            original: file,
            processed: null,
            status: 'pending',
        })));
    }, [files]);

    const handleApply = async (prompt: string) => {
        if (isProcessing) return;

        const pendingImages = images.filter(img => img.status === 'pending');
        if (pendingImages.length === 0) return;
        if (credits < pendingImages.length) {
            alert(`You need ${pendingImages.length} credits, but you only have ${credits}. Please refill.`);
            return;
        }

        setIsProcessing(true);
        onDeductCredits(pendingImages.length);

        let serviceFunction: (file: File, prompt: string) => Promise<string>;
        switch (activeTool) {
            case 'filter': serviceFunction = generateFilteredImage; break;
            case 'adjust': serviceFunction = generateAdjustedImage; break;
            case 'studio': serviceFunction = generateProductScene; break;
            default: return;
        }

        for (const image of pendingImages) {
            setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'processing' } : img));
            try {
                const resultDataUrl = await serviceFunction(image.original, prompt);
                const newFile = dataURLtoFile(resultDataUrl, `processed_${image.original.name}`);
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'done', processed: newFile } : img));
            } catch (err) {
                const errorMessage = parseErrorMessage(err);
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', error: errorMessage } : img));
            }
        }

        setIsProcessing(false);
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
        { name: 'studio', label: 'Studio', icon: StudioIcon },
    ];
    
    const getButtonText = (baseText: string) => {
        const pendingCount = images.filter(i => i.status === 'pending').length;
        if (isProcessing) return `Processing... (${progress}/${images.length})`;
        if (pendingCount > 0) return `${baseText} ${pendingCount} Images (${pendingCount} Credits)`;
        return 'All Images Processed';
    };

    const isApplyDisabled = isProcessing || images.filter(i => i.status === 'pending').length === 0;

    return (
        <div className="w-full min-h-screen flex flex-col bg-gray-900 text-gray-100">
            <Header credits={credits} onRefillCredits={onRefillCredits} />
            <div className="flex flex-grow overflow-hidden">
                {/* Main Content */}
                <main className="flex-grow flex flex-col p-4 md:p-6 overflow-hidden">
                    <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold">Batch Editor</h2>
                            <p className="text-gray-400">{images.length} images loaded. {successfulCount > 0 && `${successfulCount} processed.`}</p>
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
                                className={`w-full flex flex-col items-center gap-2 text-center p-3 rounded-lg text-base transition-colors disabled:opacity-50 ${
                                    activeTool === tool.name ? 'bg-amber-500/20 text-amber-300' : 'text-gray-300 hover:bg-white/10'
                                }`}
                            >
                                <tool.icon className="w-6 h-6"/>
                                {tool.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-grow">
                        {activeTool === 'filter' && <FilterPanel onApplyFilter={handleApply} isLoading={isProcessing} credits={credits} />}
                        {activeTool === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApply} isLoading={isProcessing} credits={credits} />}
                        {activeTool === 'studio' && <ProductStudioPanel onApplyScene={handleApply} isLoading={isProcessing} credits={credits} />}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default BatchEditor;
