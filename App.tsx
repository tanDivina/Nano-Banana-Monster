/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { ReactCompareSlider } from 'react-compare-slider';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateTransparentBackground, generateUpscaledImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import BackgroundPanel from './components/BackgroundPanel';
import UpscalePanel from './components/UpscalePanel';
import DownloadModal from './components/DownloadModal';
import RetouchPanel from './components/RetouchPanel';
import { UndoIcon, RedoIcon, RetouchIcon, PaletteIcon, SunIcon, CropIcon, BackgroundIcon, UpscaleIcon, UploadIcon, EyeIcon, CompareIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
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

type Tool = 'retouch' | 'filter' | 'adjust' | 'crop' | 'background' | 'upscale' | null;

const tools = [
  { name: 'retouch', label: 'Retouch', icon: RetouchIcon },
  { name: 'filter', label: 'Filter', icon: PaletteIcon },
  { name: 'adjust', label: 'Adjust', icon: SunIcon },
  { name: 'crop', label: 'Crop', icon: CropIcon },
  { name: 'background', label: 'Background', icon: BackgroundIcon },
  { name: 'upscale', label: 'Upscale', icon: UpscaleIcon },
] as const;

const App: React.FC = () => {
    const [history, setHistory] = useState<File[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<Tool>(null);
    const [isComparing, setIsComparing] = useState(false);
    const [hotspot, setHotspot] = useState<{ x: number, y: number } | null>(null);
    const [hotspotRadius, setHotspotRadius] = useState(50);
    const [referenceImage, setReferenceImage] = useState<File | null>(null);
    const [showOriginal, setShowOriginal] = useState(false);
    
    // Crop state
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);

    // Download modal state
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    
    const imageRef = useRef<HTMLImageElement>(null);
    const originalImage = history[0];
    const currentImage = history[historyIndex];
    const previousImage = history[historyIndex - 1];

    const currentImageUrl = currentImage ? URL.createObjectURL(currentImage) : null;
    const originalImageUrl = originalImage ? URL.createObjectURL(originalImage) : null;
    const previousImageUrl = previousImage ? URL.createObjectURL(previousImage) : null;


    // Save session to localStorage
    useEffect(() => {
        if (isRestoring) return;
        const saveSession = async () => {
            if (history.length > 0) {
                const historyAsDataUrls = await Promise.all(history.map(file => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({
                            dataUrl: reader.result as string,
                            name: file.name,
                            type: file.type
                        });
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                }));
                const sessionData = JSON.stringify({ history: historyAsDataUrls, historyIndex });
                localStorage.setItem('edit-session', sessionData);
            } else {
                localStorage.removeItem('edit-session');
            }
        };
        saveSession();
    }, [history, historyIndex, isRestoring]);

    // Load session from localStorage on mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                const savedSession = localStorage.getItem('edit-session');
                if (savedSession) {
                    const { history: historyAsDataUrls, historyIndex: savedIndex } = JSON.parse(savedSession);
                    const reconstructedHistory = historyAsDataUrls.map((item: any) =>
                        dataURLtoFile(item.dataUrl, item.name)
                    );
                    setHistory(reconstructedHistory);
                    setHistoryIndex(savedIndex);
                }
            } catch (err) {
                console.error("Failed to load session:", err);
                localStorage.removeItem('edit-session'); // Clear corrupted data
            } finally {
                setIsRestoring(false);
            }
        };
        loadSession();
    }, []);

    const updateHistory = (newImage: File) => {
        setError(null);
        setIsComparing(false); // Turn off compare mode on new history entry
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newImage);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleFileSelect = (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            const newHistory = [file];
            setHistory(newHistory);
            setHistoryIndex(0);
            setActiveTool('retouch'); // Default to retouch tool
        }
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
    };

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setIsComparing(false);
        }
    }, [historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setIsComparing(false);
        }
    }, [historyIndex, history.length]);
    
    const handleToolSelect = (tool: Tool) => {
        setIsComparing(false);
        setActiveTool(tool);
        setHotspot(null);
        setReferenceImage(null);
        if (tool !== 'crop') {
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    };

    const handleCompareToggle = useCallback(() => {
        if (historyIndex > 0) {
            const nextState = !isComparing;
            setIsComparing(nextState);
            if (nextState) {
                setActiveTool(null);
            }
        }
    }, [isComparing, historyIndex]);

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (activeTool !== 'retouch' || !imageRef.current) return;
        
        const image = imageRef.current;
        const rect = image.getBoundingClientRect();
        
        // Calculate the click position relative to the image element
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Calculate the scaling factor of the displayed image vs its natural size
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        
        // Convert the click coordinates to the original image's pixel coordinates
        const naturalX = Math.round(clickX * scaleX);
        const naturalY = Math.round(clickY * scaleY);

        setHotspot({ x: naturalX, y: naturalY });
    };
    
    const handleApplyRetouch = async (prompt: string) => {
        if (!currentImage) return;

        if (!prompt.trim() && !referenceImage) {
            setError("Please provide a text description or a reference image for the retouch.");
            return;
        }

        setIsLoading(true);
        try {
            const resultDataUrl = await generateEditedImage(currentImage, prompt, hotspot, hotspotRadius, referenceImage);
            const newFile = dataURLtoFile(resultDataUrl, `edited_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during retouching.');
        } finally {
            setIsLoading(false);
            setHotspot(null);
            setReferenceImage(null);
        }
    };

    const handleApplyFilter = async (prompt: string) => {
        if (!currentImage) return;
        setIsLoading(true);
        try {
            const resultDataUrl = await generateFilteredImage(currentImage, prompt);
            const newFile = dataURLtoFile(resultDataUrl, `filtered_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while applying the filter.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleApplyAdjustment = async (prompt: string) => {
        if (!currentImage) return;
        setIsLoading(true);
        try {
            const resultDataUrl = await generateAdjustedImage(currentImage, prompt);
            const newFile = dataURLtoFile(resultDataUrl, `adjusted_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while applying the adjustment.');
        } finally {
            setIsLoading(false);
        }
    };

    const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop, fileName: string): Promise<File> => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Canvas to Blob conversion failed."));
                    return;
                }
                const file = new File([blob], fileName, { type: 'image/png' });
                resolve(file);
            }, 'image/png');
        });
    };

    const handleApplyCrop = async () => {
        if (completedCrop?.width && completedCrop?.height && imageRef.current && currentImage) {
            setIsLoading(true);
            try {
                const croppedImageFile = await getCroppedImg(imageRef.current, completedCrop, `cropped_${Date.now()}.png`);
                updateHistory(croppedImageFile);
            } catch (err: any) {
                setError(err.message || "Failed to crop image.");
            } finally {
                setIsLoading(false);
                setCrop(undefined);
                setCompletedCrop(undefined);
            }
        }
    };
    
    const handleGenerateTransparentBackground = async () => {
        if (!currentImage) return;
        setIsLoading(true);
        try {
            const resultDataUrl = await generateTransparentBackground(currentImage);
            const newFile = dataURLtoFile(resultDataUrl, `transparent_bg_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during background removal.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const applyOverlay = (overlayFile: File, operation: 'background' | 'color', color?: string): Promise<File> => {
        return new Promise((resolve, reject) => {
            const baseImage = new Image();
            baseImage.src = URL.createObjectURL(currentImage);
            baseImage.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = baseImage.naturalWidth;
                canvas.height = baseImage.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }

                if (operation === 'background') {
                    const backgroundImage = new Image();
                    backgroundImage.src = URL.createObjectURL(overlayFile);
                    backgroundImage.onload = () => {
                        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
                        ctx.drawImage(baseImage, 0, 0); // Draw current image on top
                        canvas.toBlob(blob => {
                            if (blob) resolve(new File([blob], `bg_added_${Date.now()}.png`, { type: 'image/png' }));
                            else reject(new Error("Canvas to blob conversion failed"));
                        }, 'image/png');
                    };
                    backgroundImage.onerror = () => reject(new Error("Failed to load background image"));
                } else if (operation === 'color' && color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(baseImage, 0, 0);
                    canvas.toBlob(blob => {
                        if (blob) resolve(new File([blob], `color_bg_${Date.now()}.png`, { type: 'image/png' }));
                        else reject(new Error("Canvas to blob conversion failed"));
                    }, 'image/png');
                }
            };
            baseImage.onerror = () => reject(new Error("Failed to load base image"));
        });
    };


    const handleApplyBackgroundColor = async (color: string) => {
        if (!currentImage) return;
        setIsLoading(true);
        try {
            // A dummy file is needed for the function signature, but not used for color operation
            const dummyFile = new File([], "dummy.png");
            const newFile = await applyOverlay(dummyFile, 'color', color);
            updateHistory(newFile);
        } catch (err: any) {
            setError(err.message || "Failed to apply color background.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyBackgroundImage = async (file: File) => {
        if (!currentImage) return;
        setIsLoading(true);
        try {
            const newFile = await applyOverlay(file, 'background');
            updateHistory(newFile);
        } catch (err: any) {
            setError(err.message || "Failed to apply background image.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUpscaleImage = async () => {
        if (!currentImage) return;
        setIsLoading(true);
        try {
            const resultDataUrl = await generateUpscaledImage(currentImage);
            const newFile = dataURLtoFile(resultDataUrl, `upscaled_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during upscaling.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = (format: 'image/png' | 'image/jpeg', quality = 0.92) => {
        if (!currentImage || !currentImageUrl) return;
        
        const image = new Image();
        image.src = currentImageUrl;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(image, 0, 0);
            
            const link = document.createElement('a');
            const extension = format === 'image/jpeg' ? 'jpg' : 'png';
            link.download = `edited_image.${extension}`;
            link.href = canvas.toDataURL(format, quality);
            link.click();
            setIsDownloadModalOpen(false);
        };
    };


    if (!currentImage && !isRestoring) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <StartScreen onFileSelect={handleFileSelect} />
            </div>
        );
    }
    
    if (isRestoring) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                 <Spinner />
            </div>
        );
    }

    const renderPanel = () => {
        switch (activeTool) {
            case 'retouch':
                return <RetouchPanel 
                            onApplyRetouch={handleApplyRetouch} 
                            isLoading={isLoading}
                            radius={hotspotRadius}
                            onRadiusChange={setHotspotRadius}
                            isHotspotSet={!!hotspot}
                            referenceImage={referenceImage}
                            onReferenceImageChange={setReferenceImage}
                        />;
            case 'filter':
                return <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />;
            case 'adjust':
                return <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />;
            case 'crop':
                return <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setCropAspect} isLoading={isLoading} isCropping={!!completedCrop?.width} />;
            case 'background':
                return <BackgroundPanel 
                            onGenerateTransparentBackground={handleGenerateTransparentBackground} 
                            onApplyBackgroundColor={handleApplyBackgroundColor}
                            onApplyBackgroundImage={handleApplyBackgroundImage}
                            isLoading={isLoading} 
                        />;
            case 'upscale':
                return <UpscalePanel onUpscaleImage={handleUpscaleImage} isLoading={isLoading} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header />
            <main className="flex-grow flex flex-col md:flex-row gap-8 p-8 overflow-hidden">
                {/* Left Panel: Toolbar */}
                <aside className="flex flex-col gap-6">
                    {/* Main Tools */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 flex flex-row md:flex-col items-center gap-2 backdrop-blur-sm">
                       {tools.map(tool => (
                            <button 
                                key={tool.name}
                                onClick={() => handleToolSelect(tool.name)}
                                disabled={isLoading}
                                className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 border-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                    ${activeTool === tool.name 
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-400' 
                                        : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/70 text-gray-300'
                                    }`}
                                aria-label={tool.label}
                            >
                                <tool.icon className="w-6 h-6" />
                                <span className="text-xs font-semibold">{tool.label}</span>
                            </button>
                       ))}
                    </div>

                    {/* History & View Controls */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 flex flex-row md:flex-col items-center gap-2 backdrop-blur-sm">
                        <button onClick={handleUndo} disabled={historyIndex <= 0 || isLoading} className="w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 bg-gray-800/50 border-2 border-gray-700 hover:bg-gray-700/70 text-gray-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            <UndoIcon className="w-6 h-6" />
                            <span className="text-xs font-semibold">Undo</span>
                        </button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1 || isLoading} className="w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 bg-gray-800/50 border-2 border-gray-700 hover:bg-gray-700/70 text-gray-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            <RedoIcon className="w-6 h-6" />
                            <span className="text-xs font-semibold">Redo</span>
                        </button>
                        <button
                            onClick={handleCompareToggle}
                            disabled={historyIndex <= 0 || isLoading}
                            className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 border-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                ${isComparing
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-400' 
                                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/70 text-gray-300'
                                }`}
                            aria-label="Compare with previous"
                        >
                            <CompareIcon className="w-6 h-6" />
                            <span className="text-xs font-semibold">Compare</span>
                        </button>
                         <button 
                            onMouseDown={() => setShowOriginal(true)} 
                            onMouseUp={() => setShowOriginal(false)}
                            onMouseLeave={() => setShowOriginal(false)}
                            disabled={isLoading} 
                            className="w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 bg-gray-800/50 border-2 border-gray-700 hover:bg-gray-700/70 text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                            aria-label="Hold to view original"
                        >
                            <EyeIcon className="w-6 h-6" />
                            <span className="text-xs font-semibold">Original</span>
                        </button>
                    </div>
                </aside>

                {/* Center Panel: Image Canvas */}
                <section className="flex-grow flex flex-col items-center justify-center relative overflow-hidden bg-black/30 rounded-lg border border-gray-700">
                   {isLoading && (
                        <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center gap-4 backdrop-blur-sm animate-fade-in">
                            <Spinner />
                            <p className="text-lg font-semibold text-gray-200">Applying AI magic...</p>
                        </div>
                   )}
                   {error && <div className="absolute top-4 left-4 right-4 bg-red-500/80 text-white p-4 rounded-lg z-30 animate-fade-in">{error}</div>}
                   
                   <div className="w-full h-full flex items-center justify-center p-4">
                        {currentImageUrl && (
                            isComparing && previousImageUrl ? (
                                <ReactCompareSlider
                                    className="w-full h-full"
                                    itemOne={<img src={previousImageUrl} alt="Previous" className="max-w-none w-full h-full object-contain" />}
                                    itemTwo={<img src={currentImageUrl} alt="Current" className="max-w-none w-full h-full object-contain" />}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            ) :
                            showOriginal && originalImageUrl ? (
                                <img
                                    ref={imageRef}
                                    src={originalImageUrl}
                                    alt="Original"
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : (
                                activeTool === 'crop' ? (
                                    <ReactCrop
                                        crop={crop}
                                        onChange={c => setCrop(c)}
                                        onComplete={c => setCompletedCrop({ ...c })}
                                        aspect={cropAspect}
                                    >
                                        <img
                                            ref={imageRef}
                                            src={currentImageUrl}
                                            alt="Editable image"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </ReactCrop>
                                ) : (
                                    <div className="relative">
                                        <img
                                            ref={imageRef}
                                            src={currentImageUrl}
                                            alt="Current edit"
                                            className={`max-w-full max-h-full object-contain ${activeTool === 'retouch' ? 'cursor-crosshair' : ''}`}
                                            onClick={handleImageClick}
                                        />
                                        {hotspot && imageRef.current && (
                                            <div 
                                                className="absolute border-2 border-dashed border-white rounded-full pointer-events-none"
                                                style={{
                                                    left: `${(hotspot.x / imageRef.current.naturalWidth) * 100}%`,
                                                    top: `${(hotspot.y / imageRef.current.naturalHeight) * 100}%`,
                                                    width: `${(hotspotRadius * 2 / imageRef.current.naturalWidth) * 100}%`,
                                                    height: `${(hotspotRadius * 2 / imageRef.current.naturalHeight) * 100}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                }}
                                            />
                                        )}
                                    </div>
                                )
                            )
                        )}
                   </div>
                </section>

                {/* Right Panel: Tool Options */}
                <aside className="w-full md:w-[420px] lg:w-[480px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto">
                    <div className="flex-grow flex items-center">
                        {renderPanel()}
                    </div>
                    <div className="flex flex-col gap-3">
                         <button 
                            onClick={() => setIsDownloadModalOpen(true)}
                            disabled={isLoading}
                            className="w-full text-center bg-amber-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:bg-amber-400 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:bg-amber-800 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                         >
                            Download Image
                        </button>
                        <label htmlFor="image-upload-main" className="w-full text-center bg-white/10 text-white font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-white/20 active:scale-95 text-base cursor-pointer disabled:opacity-50">
                            <div className="flex items-center justify-center gap-2">
                                <UploadIcon className="w-5 h-5"/>
                                Upload Another
                            </div>
                        </label>
                        <input id="image-upload-main" type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isLoading} />
                    </div>
                </aside>
            </main>
            <DownloadModal 
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                onDownload={handleDownload}
                imageSrc={currentImageUrl}
            />
        </div>
    );
};

export default App;