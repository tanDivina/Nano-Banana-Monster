/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { ReactCompareSlider } from 'react-compare-slider';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateTransparentBackground, generateUpscaledImage, generateSocialPostTitle, generateProductScene, generateColorizedImage, generateRepairedImage, generateColorizedAndRepairedImage } from './services/geminiService';
import { saveSession, loadSession, clearSession } from './services/dbService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import BackgroundPanel from './components/BackgroundPanel';
import UpscalePanel from './components/UpscalePanel';
import DownloadModal from './components/DownloadModal';
import RetouchPanel from './components/RetouchPanel';
import SocialPanel from './components/SocialPanel';
import ErasePanel from './components/ErasePanel';
import ProductStudioPanel from './components/ProductStudioPanel';
import { UndoIcon, RedoIcon, RetouchIcon, EraseIcon, PaletteIcon, SunIcon, CropIcon, BackgroundIcon, UpscaleIcon, UploadIcon, EyeIcon, CompareIcon, HeartIcon, DownloadIcon, StudioIcon, ColorizeIcon, StackIcon } from './components/icons';
import BatchEditor from './components/BatchEditor';
import ColorizePanel from './components/ColorizePanel';
import DynamicCursor from './components/DynamicCursor';

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

// Helper to create a centered crop with a given aspect ratio
function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ): Crop {
    const mediaAspect = mediaWidth / mediaHeight;
    let cropWidth = mediaWidth;
    let cropHeight = mediaHeight;
  
    if (mediaAspect > aspect) {
      // Image is wider than aspect ratio, so constrain by height
      cropWidth = mediaHeight * aspect;
    } else {
      // Image is taller than aspect ratio, so constrain by width
      cropHeight = mediaWidth / aspect;
    }
  
    // Add a 5% margin for better initial view
    const marginFactor = 0.95;
    cropWidth *= marginFactor;
    cropHeight *= marginFactor;
  
    const x = (mediaWidth - cropWidth) / 2;
    const y = (mediaHeight - cropHeight) / 2;
  
    return {
      unit: '%',
      x: (x / mediaWidth) * 100,
      y: (y / mediaHeight) * 100,
      width: (cropWidth / mediaWidth) * 100,
      height: (cropHeight / mediaHeight) * 100,
    };
}

type Tool = 'retouch' | 'erase' | 'filter' | 'adjust' | 'colorize' | 'crop' | 'background' | 'upscale' | 'social' | 'studio' | null;
type RestorationOperation = 'colorize' | 'repair' | 'colorize_repair' | null;

const tools = [
  { name: 'retouch', label: 'Retouch', icon: RetouchIcon },
  { name: 'erase', label: 'Erase', icon: EraseIcon },
  { name: 'filter', label: 'Filter', icon: PaletteIcon },
  { name: 'adjust', label: 'Adjust', icon: SunIcon },
  { name: 'colorize', label: 'Revive', icon: ColorizeIcon },
  { name: 'crop', label: 'Crop', icon: CropIcon, comingSoon: true },
  { name: 'background', label: 'Background', icon: BackgroundIcon },
  { name: 'upscale', label: 'Upscale', icon: UpscaleIcon },
  { name: 'studio', label: 'Product Studio', icon: StudioIcon },
  { name: 'social', label: 'Social Post', icon: HeartIcon, comingSoon: true },
] as const;

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const INITIAL_CREDITS = 25;

const App: React.FC = () => {
    const [editMode, setEditMode] = useState<'single' | 'batch'>('single');
    const [batchFiles, setBatchFiles] = useState<File[]>([]);
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
    const [credits, setCredits] = useState(INITIAL_CREDITS);
    const [activeRestoration, setActiveRestoration] = useState<RestorationOperation>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    
    // Crop & Social state
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
    const [socialText, setSocialText] = useState('');
    const [socialTitleSuggestions, setSocialTitleSuggestions] = useState<string[]>([]);
    const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
    const [socialTextPosition, setSocialTextPosition] = useState({ x: 50, y: 50 }); // Center in %
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
    const [socialFont, setSocialFont] = useState('Bebas Neue');
    const [socialColor, setSocialColor] = useState('#FFFFFF');
    const [socialShadow, setSocialShadow] = useState('2px 2px 4px rgba(0,0,0,0.8)');
    const [socialFontSize, setSocialFontSize] = useState(6);

    // Erase state
    const [eraseSelection, setEraseSelection] = useState<Crop>();
    const [completedEraseSelection, setCompletedEraseSelection] = useState<PixelCrop>();

    // Download modal state
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    
    const imageRef = useRef<HTMLImageElement>(null);
    const newUploadInputRef = useRef<HTMLInputElement>(null);
    const imageContainerRef = useRef<HTMLElement>(null);
    const textOverlayRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ mouseX: number, mouseY: number, textX: number, textY: number } | null>(null);
    
    // Style for comparison slider items to ensure consistent dimensions
    const compareWrapperStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    };
    
    const originalImage = history[0];
    const currentImage = history[historyIndex];

    const currentImageUrl = currentImage ? URL.createObjectURL(currentImage) : null;
    const originalImageUrl = originalImage ? URL.createObjectURL(originalImage) : null;

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
        setImageDimensions({ width, height });
    };

    // Save session to IndexedDB
    useEffect(() => {
        if (isRestoring || editMode === 'batch') return;
        const save = async () => {
            try {
                if (history.length > 0) {
                    await saveSession({ history, historyIndex, credits });
                } else {
                    await clearSession();
                }
            } catch (err) {
                console.error("Error saving session to IndexedDB:", err);
            }
        };
        save();
    }, [history, historyIndex, credits, isRestoring, editMode]);

    // Load session from IndexedDB on mount
    useEffect(() => {
        const load = async () => {
            try {
                const savedSession = await loadSession();
                if (savedSession && savedSession.history.length > 0) {
                     // Ensure files are actual File objects, as IndexedDB can sometimes return plain objects
                    // FIX: Add `any` type to `f` to prevent TypeScript from inferring it as `never` in the else branch.
                    const reconstructedHistory = savedSession.history.map((f: any) => {
                        if (f instanceof File) return f;
                        // Reconstruct if it's not a File instance
                        return new File([f], f.name, { type: f.type, lastModified: f.lastModified });
                    });
                    setHistory(reconstructedHistory);
                    setHistoryIndex(savedSession.historyIndex);
                    setCredits(savedSession.credits ?? INITIAL_CREDITS);
                    setEditMode('single');
                }
            } catch (err) {
                console.error("Failed to load session from IndexedDB:", err);
                await clearSession().catch(clearErr => console.error("Failed to clear session after load error:", clearErr));
            } finally {
                setIsRestoring(false);
            }
        };
        load();
    }, []);

    const parseErrorMessage = (error: any): string => {
        const defaultMessage = 'An unexpected error occurred. Please try again.';
        if (!error || !error.message) {
            return defaultMessage;
        }
    
        const message = String(error.message).toLowerCase();
    
        if (message.includes('unsupported mime type')) {
            return 'Unsupported file type. Please upload a JPEG, PNG, or WEBP image.';
        }
        if (message.includes('blocked due to safety')) {
            return 'Your request was blocked for safety reasons. Please adjust your prompt and try again.';
        }
        if (message.includes('request was blocked')) {
            return 'Your request was blocked. Please try a different prompt or image.';
        }
        if (message.includes('generation stopped unexpectedly')) {
            return 'The AI stopped responding. This can happen with complex requests. Please try again.';
        }
        if (message.includes('api_key')) {
            return 'There was a configuration issue. Please try again later.';
        }
        if (message.includes('network error') || message.includes('failed to fetch')) {
            return 'A network error occurred. Please check your internet connection and try again.';
        }
         if (message.includes('could not generate image')) {
            return 'The AI could not generate an image for this request. Please try a different prompt.';
        }
    
        console.error("Unhandled API Error:", error);
        return defaultMessage;
    };

    const deductCredit = () => {
        setCredits(prev => Math.max(0, prev - 1));
    };
    
    const deductCredits = (amount: number) => {
        setCredits(prev => Math.max(0, prev - amount));
    };

    const refillCredits = () => {
        setCredits(INITIAL_CREDITS);
    };

    const updateHistory = (newImage: File) => {
        setError(null);
        setIsComparing(false); // Turn off compare mode on new history entry
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newImage);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };
    
    const resetAndLoadImage = (file: File) => {
        if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
            setError(`Unsupported file type (${file.type}). Please upload a JPEG, PNG, or WEBP.`);
            return;
        }

        // Reset all state
        setError(null);
        setHistory([file]);
        setHistoryIndex(0);
        setActiveTool('retouch'); // Default tool
        setIsComparing(false);
        setHotspot(null);
        setReferenceImage(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setEraseSelection(undefined);
        setCompletedEraseSelection(undefined);
        setSocialText('');
        setSocialTextPosition({ x: 50, y: 50 });
        setCropAspect(undefined);
        setSocialTitleSuggestions([]);
        setImageDimensions(null);
        setSocialFont('Bebas Neue');
        setSocialColor('#FFFFFF');
        setSocialShadow('2px 2px 4px rgba(0,0,0,0.8)');
        setSocialFontSize(6);
        setCredits(INITIAL_CREDITS);
        setEditMode('single'); // Ensure single edit mode
        clearSession().catch(err => console.error("Failed to clear session:", err));
    };

    const handleFileSelect = (files: FileList | null) => {
        if (files && files[0]) {
            resetAndLoadImage(files[0]);
        }
    };

    const handleBatchFileSelect = (files: FileList | null) => {
        if (files && files.length > 0) {
            const validFiles = Array.from(files).filter(file => SUPPORTED_MIME_TYPES.includes(file.type));
            if (validFiles.length === 0) {
                setError(`No supported file types found. Please upload JPEG, PNG, or WEBP images.`);
                return;
            }
            if (validFiles.length < files.length) {
                setError(`Some files were not supported and have been ignored.`);
            } else {
                setError(null);
            }
            setBatchFiles(validFiles);
            setEditMode('batch');
            setCredits(INITIAL_CREDITS);
            clearSession().catch(err => console.error("Failed to clear session:", err));
        }
    };
    
    const handleNewUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
       // Reset file input value to allow re-uploading the same file
       if (e.target) e.target.value = '';
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
        // Reset tool-specific states
        setHotspot(null);
        setReferenceImage(null);
        setSocialText('');
        setSocialTitleSuggestions([]);
        setSocialTextPosition({ x: 50, y: 50 });
        
        if (tool !== 'crop' && tool !== 'social') {
            setCrop(undefined);
            setCompletedCrop(undefined);
            setCropAspect(undefined);
        }
        if (tool !== 'erase') {
            setEraseSelection(undefined);
            setCompletedEraseSelection(undefined);
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

        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        if (!prompt.trim() && !referenceImage) {
            setError("Please provide a text description or a reference image for the retouch.");
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            deductCredit();
            const resultDataUrl = await generateEditedImage(currentImage, prompt, hotspot, hotspotRadius, referenceImage, undefined, imageDimensions);
            const newFile = dataURLtoFile(resultDataUrl, `edited_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
            setHotspot(null);
            setReferenceImage(null);
        }
    };

    const handleApplyErase = async (prompt: string) => {
        if (!currentImage) return;

        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }
    
        if (!prompt.trim() && !(completedEraseSelection?.width && completedEraseSelection.height)) {
            setError("Please describe what to erase or select an area on the image.");
            return;
        }
    
        setError(null);
        setIsLoading(true);
        try {
            deductCredit();
            const promptText = prompt.trim();
            const eraseInstruction = promptText
                ? `Photorealistically remove "${promptText}" from the image. Intelligently fill the resulting space, blending it seamlessly with the surroundings to make it look as if the object was never there.`
                : `Photorealistically remove the most prominent object within the selected area. Intelligently fill the resulting space, blending it seamlessly with the surroundings to make it look as if the object was never there. This is an inpainting task.`;
            
            const resultDataUrl = await generateEditedImage(currentImage, eraseInstruction, null, 0, null, completedEraseSelection, imageDimensions);
            const newFile = dataURLtoFile(resultDataUrl, `erased_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
            setEraseSelection(undefined);
            setCompletedEraseSelection(undefined);
        }
    };

    const handleApplyFilter = async (prompt: string) => {
        if (!currentImage) return;
        
        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }
        
        setError(null);
        setIsLoading(true);
        try {
            deductCredit();
            const resultDataUrl = await generateFilteredImage(currentImage, prompt);
            const newFile = dataURLtoFile(resultDataUrl, `filtered_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleApplyAdjustment = async (prompt: string) => {
        if (!currentImage) return;

        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsLoading(true);
        try {
            deductCredit();
            const resultDataUrl = await generateAdjustedImage(currentImage, prompt);
            const newFile = dataURLtoFile(resultDataUrl, `adjusted_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyProductScene = async (prompt: string) => {
        if (!currentImage) return;

        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsLoading(true);
        try {
            deductCredit();
            const resultDataUrl = await generateProductScene(currentImage, prompt);
            const newFile = dataURLtoFile(resultDataUrl, `scene_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyColorize = async () => {
        if (!currentImage) return;
        
        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setActiveRestoration('colorize');
        try {
            deductCredit();
            const resultDataUrl = await generateColorizedImage(currentImage);
            const newFile = dataURLtoFile(resultDataUrl, `colorized_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
            setActiveRestoration(null);
        }
    };

    const handleApplyRepair = async () => {
        if (!currentImage) return;
        
        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setActiveRestoration('repair');
        try {
            deductCredit();
            const resultDataUrl = await generateRepairedImage(currentImage);
            const newFile = dataURLtoFile(resultDataUrl, `repaired_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
            setActiveRestoration(null);
        }
    };

    const handleApplyColorizeAndRepair = async () => {
        if (!currentImage) return;
        
        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setActiveRestoration('colorize_repair');
        try {
            deductCredit();
            const resultDataUrl = await generateColorizedAndRepairedImage(currentImage);
            const newFile = dataURLtoFile(resultDataUrl, `restored_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
            setActiveRestoration(null);
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
        if (completedCrop?.width && completedCrop?.height && imageRef.current && imageRef.current.naturalWidth > 0 && currentImage) {
            setError(null);
            setIsLoading(true);
            try {
                const croppedImageFile = await getCroppedImg(imageRef.current, completedCrop, `cropped_${Date.now()}.png`);
                updateHistory(croppedImageFile);
            } catch (err: any) {
                setError(parseErrorMessage(err));
            } finally {
                setIsLoading(false);
                setCrop(undefined);
                setCompletedCrop(undefined);
            }
        }
    };
    
    const handleSetAspect = useCallback((aspect: number | undefined) => {
        setCropAspect(aspect);
        
        // If an aspect is selected, create a centered crop for it.
        if (aspect && imageDimensions) {
            const { width, height } = imageDimensions;
            const newCrop = centerAspectCrop(width, height, aspect);
            setCrop(newCrop);
            
            // Also update completedCrop to enable the apply button immediately
            const pixelCrop: PixelCrop = {
                unit: 'px',
                x: Math.round((newCrop.x / 100) * width),
                y: Math.round((newCrop.y / 100) * height),
                width: Math.round((newCrop.width / 100) * width),
                height: Math.round((newCrop.height / 100) * height),
            };
            setCompletedCrop(pixelCrop);
        } 
        // For 'free' aspect ratio, or if dimensions aren't ready, clear the crop
        else if (!aspect) {
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    }, [imageDimensions]);

    const applyTextToCanvas = (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        color: string,
        shadow: string
    ) => {
        // Reset any previous shadows
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = color;
    
        if (!shadow || shadow === 'none') {
            ctx.fillText(text, x, y);
            return;
        }
    
        // Outline effect
        if (shadow.includes(',')) { // Heuristic for outline preset with multiple shadows
            const outlineColor = '#000'; // Assuming black outline from the preset
            const outlineWidth = 2; 
            ctx.fillStyle = outlineColor;
            ctx.fillText(text, x - outlineWidth, y - outlineWidth);
            ctx.fillText(text, x + outlineWidth, y - outlineWidth);
            ctx.fillText(text, x - outlineWidth, y + outlineWidth);
            ctx.fillText(text, x + outlineWidth, y + outlineWidth);
            // Main text on top
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
        } else { // Drop shadow effect
            const shadowRegex = /(-?\d+(?:\.\d+)?px)\s+(-?\d+(?:\.\d+)?px)\s+(-?\d+(?:\.\d+)?px)\s+(rgba?\(.+?\))/;
            const match = shadow.match(shadowRegex);
            if (match) {
                ctx.shadowOffsetX = parseInt(match[1], 10);
                ctx.shadowOffsetY = parseInt(match[2], 10);
                ctx.shadowBlur = parseInt(match[3], 10);
                ctx.shadowColor = match[4];
                ctx.fillStyle = color;
                ctx.fillText(text, x, y);
    
                // Reset shadow for subsequent draws on the canvas
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            } else {
                // Fallback if regex fails
                ctx.fillText(text, x, y);
            }
        }
    };
    

    const getCroppedAndCompositedImg = (
        image: HTMLImageElement,
        crop: PixelCrop,
        fileName: string,
        text: string,
        textPosition: { x: number; y: number },
        font: string,
        color: string,
        shadow: string,
        fontSizeValue: number,
    ): Promise<File> => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
    
        // 1. Draw the cropped image
        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0, 0, crop.width, crop.height
        );
    
        // 2. Add text overlay if provided
        if (text) {
            const fontSize = Math.round(canvas.width * (fontSizeValue / 100));
            ctx.font = `bold ${fontSize}px "${font}"`;
            ctx.textAlign = 'center';
    
            // Word wrapping
            const maxWidth = canvas.width * 0.9;
            const words = text.split(' ');
            let line = '';
            const lines = [];
            for (const word of words) {
                const testLine = line ? `${line} ${word}` : word;
                if (ctx.measureText(testLine).width > maxWidth && line) {
                    lines.push(line);
                    line = word;
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
    
            // Drawing
            const lineHeight = fontSize * 1.2;
            const totalTextHeight = lines.length * lineHeight;
            const textX = (textPosition.x / 100) * canvas.width;
            let startY = (textPosition.y / 100) * canvas.height - (totalTextHeight / 2);
            
            ctx.textBaseline = 'top'; // Set baseline to top for easier calculation
    
            for (const currentLine of lines) {
                applyTextToCanvas(ctx, currentLine, textX, startY, color, shadow);
                startY += lineHeight;
            }
        }
    
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
    
    
    const handleApplySocialPost = async () => {
        if (imageRef.current && imageRef.current.naturalWidth > 0 && currentImage) {
            setError(null);
            setIsLoading(true);
            
            const cropToApply: PixelCrop = (completedCrop?.width && completedCrop?.height)
                ? completedCrop
                : {
                    x: 0,
                    y: 0,
                    width: imageRef.current.naturalWidth,
                    height: imageRef.current.naturalHeight,
                    unit: 'px',
                };

            try {
                const compositedImageFile = await getCroppedAndCompositedImg(
                    imageRef.current,
                    cropToApply,
                    `social_post_${Date.now()}.png`,
                    socialText,
                    socialTextPosition,
                    socialFont,
                    socialColor,
                    socialShadow,
                    socialFontSize
                );
                updateHistory(compositedImageFile);
            } catch (err: any) {
                setError(parseErrorMessage(err));
            } finally {
                setIsLoading(false);
                setCrop(undefined);
                setCompletedCrop(undefined);
                setSocialText('');
                setSocialTextPosition({ x: 50, y: 50 });
                setSocialTitleSuggestions([]);
            }
        }
    };
    
    const handleSuggestSocialTitles = async () => {
        if (!currentImage) return;

        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsSuggestingTitles(true);
        setSocialTitleSuggestions([]);
        try {
            deductCredit();
            const suggestions = await generateSocialPostTitle(currentImage);
            setSocialTitleSuggestions(suggestions);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsSuggestingTitles(false);
        }
    };
    
    const handleApplyBackgroundColor = async (color: string) => {
        if (!currentImage) return;
        setError(null);
        setIsLoading(true);
        // This is a placeholder for a more complex operation.
        // For a real implementation, you would need a way to composite the foreground
        // (presumably with a transparent background) onto a new background of the chosen color.
        // This often requires the image to have been processed by 'remove background' first.
        
        // Simple canvas-based example:
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(blob => {
                        if (blob) {
                            const newFile = new File([blob], `bg_color_${Date.now()}.png`, { type: 'image/png' });
                            updateHistory(newFile);
                        }
                    }, 'image/png');
                }
                setIsLoading(false);
            };
            img.onerror = () => {
                setError("Failed to load image for background color application.");
                setIsLoading(false);
            };
            img.src = URL.createObjectURL(currentImage);
        } catch (err) {
            setError(parseErrorMessage(err));
            setIsLoading(false);
        }
    };

    const handleApplyBackgroundImage = async (backgroundImageFile: File) => {
        if (!currentImage) return;
        setError(null);
        setIsLoading(true);

        try {
            // This is a simplified example. A real implementation would likely use Gemini
            // to composite the foreground from `currentImage` onto the `backgroundImageFile`.
            const foregroundImg = new Image();
            foregroundImg.crossOrigin = 'anonymous';
            const backgroundImg = new Image();
            backgroundImg.crossOrigin = 'anonymous';

            const foregroundPromise = new Promise<void>((resolve, reject) => {
                foregroundImg.onload = () => resolve();
                foregroundImg.onerror = reject;
                foregroundImg.src = URL.createObjectURL(currentImage);
            });

            const backgroundPromise = new Promise<void>((resolve, reject) => {
                backgroundImg.onload = () => resolve();
                backgroundImg.onerror = reject;
                backgroundImg.src = URL.createObjectURL(backgroundImageFile);
            });

            await Promise.all([foregroundPromise, backgroundPromise]);

            const canvas = document.createElement('canvas');
            canvas.width = backgroundImg.naturalWidth;
            canvas.height = backgroundImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(backgroundImg, 0, 0);
                // Draw foreground on top, scaled to fit. This is a naive approach.
                // A better approach would be to maintain aspect ratio.
                ctx.drawImage(foregroundImg, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(blob => {
                    if (blob) {
                        const newFile = new File([blob], `bg_image_${Date.now()}.png`, { type: 'image/png' });
                        updateHistory(newFile);
                    }
                }, 'image/png');
            }
        } catch (err) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateTransparentBg = async () => {
        if (!currentImage) return;
        
        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsLoading(true);
        try {
            deductCredit();
            const resultDataUrl = await generateTransparentBackground(currentImage);
            const newFile = dataURLtoFile(resultDataUrl, `transparent_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpscaleImage = async () => {
        if (!currentImage) return;
        
        if (credits <= 0) {
            setError("You are out of credits. Click 'Get More' in the header to refill.");
            return;
        }

        setError(null);
        setIsLoading(true);
        try {
            deductCredit();
            const resultDataUrl = await generateUpscaledImage(currentImage);
            const newFile = dataURLtoFile(resultDataUrl, `upscaled_${Date.now()}.png`);
            updateHistory(newFile);
        } catch (err: any) {
            setError(parseErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (format: 'image/png' | 'image/jpeg', quality?: number) => {
        if (!currentImage || !currentImageUrl) return;
    
        const link = document.createElement('a');
        
        if (format === 'image/jpeg') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    link.href = dataUrl;
                    link.download = `edited_image_${Date.now()}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            };
            img.src = currentImageUrl;
        } else {
            link.href = currentImageUrl;
            link.download = `edited_image_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    
        setIsDownloadModalOpen(false);
    };

    const handleTextMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current) return;
        setIsDraggingText(true);
        const rect = imageRef.current.getBoundingClientRect();
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            textX: socialTextPosition.x,
            textY: socialTextPosition.y,
        };
        // Prevent text selection while dragging
        e.preventDefault();
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingText || !dragStartRef.current || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStartRef.current.mouseX;
        const deltaY = e.clientY - dragStartRef.current.mouseY;

        // Convert pixel delta to percentage delta
        const deltaPercentX = (deltaX / rect.width) * 100;
        const deltaPercentY = (deltaY / rect.height) * 100;

        let newX = dragStartRef.current.textX + deltaPercentX;
        let newY = dragStartRef.current.textY + deltaPercentY;

        // Clamp values between 0 and 100
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        setSocialTextPosition({ x: newX, y: newY });
    }, [isDraggingText]);

    const handleMouseUp = useCallback(() => {
        setIsDraggingText(false);
        dragStartRef.current = null;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    if (isRestoring) {
        return <div className="w-full h-screen flex items-center justify-center"><Spinner/></div>
    }
    
    if (editMode === 'batch') {
        return (
            <BatchEditor 
                files={batchFiles} 
                onExit={() => { setEditMode('single'); setBatchFiles([]); }}
                credits={credits}
                onRefillCredits={refillCredits}
                onDeductCredits={deductCredits}
                parseErrorMessage={parseErrorMessage}
            />
        );
    }
    
    return (
        <div className="w-full min-h-screen flex flex-col bg-gray-900 text-gray-100">
            <DynamicCursor />
            <Header credits={credits} onRefillCredits={refillCredits} />
            <div className="flex flex-grow overflow-hidden">
                {/* Left Toolbar */}
                <aside className="w-80 bg-gray-900/50 border-r border-gray-700 p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleUndo} disabled={historyIndex <= 0 || isLoading} className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-gray-200 font-semibold py-2.5 px-4 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            <UndoIcon className="w-5 h-5"/> Undo
                        </button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1 || isLoading} className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-gray-200 font-semibold py-2.5 px-4 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            <RedoIcon className="w-5 h-5"/> Redo
                        </button>
                    </div>

                    <div className="w-full border-t border-gray-700 my-2"></div>

                    <nav className="flex flex-col gap-2">
                        {tools.map(tool => {
                            const isComingSoon = 'comingSoon' in tool && (tool as { comingSoon?: boolean }).comingSoon;
                            return (
                                <button
                                    key={tool.name}
                                    onClick={() => !isComingSoon && handleToolSelect(tool.name)}
                                    disabled={isLoading || !currentImage || isComingSoon}
                                    className={`w-full flex items-center gap-3 text-left p-3 rounded-lg text-base transition-colors disabled:opacity-50 ${
                                        activeTool === tool.name ? 'bg-amber-500/20 text-amber-300' : 'text-gray-300 hover:bg-white/10'
                                    } ${isComingSoon ? 'cursor-not-allowed' : ''}`}
                                >
                                    <tool.icon className="w-6 h-6"/>
                                    <span>{tool.label}</span>
                                    {isComingSoon && (
                                        <span className="ml-auto text-xs font-semibold text-gray-500 bg-gray-700/50 px-2 py-1 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="w-full border-t border-gray-700 my-2"></div>

                    <div className="relative">
                        <label htmlFor="new-upload" className="w-full cursor-pointer flex items-center justify-center gap-3 text-left p-3 rounded-lg text-base transition-colors text-gray-300 hover:bg-white/10">
                            <UploadIcon className="w-6 h-6"/> New Image...
                        </label>
                        <input id="new-upload" type="file" ref={newUploadInputRef} onChange={handleNewUpload} accept={SUPPORTED_MIME_TYPES.join(',')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                    </div>
                    
                    <div className="mt-auto flex flex-col gap-2 pt-8">
                         <div className="flex items-center gap-2">
                            <button 
                                onClick={handleCompareToggle} 
                                disabled={historyIndex <= 0 || isLoading} 
                                className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-md transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isComparing 
                                    ? 'bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-md shadow-amber-500/20' 
                                    : 'bg-white/10 text-gray-200 hover:bg-white/20'
                                }`}
                            >
                                <CompareIcon className="w-5 h-5"/> Compare
                            </button>
                            <button onMouseDown={() => setShowOriginal(true)} onMouseUp={() => setShowOriginal(false)} onMouseLeave={() => setShowOriginal(false)} disabled={historyIndex <= 0} className="flex h-full items-center justify-center w-14 bg-white/10 text-gray-200 font-semibold p-2.5 rounded-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" title="Hold to see original">
                                <EyeIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <button onClick={() => setIsDownloadModalOpen(true)} disabled={!currentImage} className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold py-3 px-4 rounded-lg transition-all hover:shadow-lg hover:shadow-amber-500/30 active:scale-95 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none">
                            <DownloadIcon className="w-6 h-6"/> Download
                        </button>
                    </div>

                </aside>

                {/* Main Content */}
                <main 
                    ref={imageContainerRef} 
                    className={`relative flex-grow flex items-center justify-center overflow-hidden p-4 md:p-8 transition-colors duration-300 ${isDraggingOver && !currentImageUrl ? 'bg-amber-500/10' : ''}`}
                    onDragOver={(e) => { 
                        e.preventDefault();
                        if (!currentImageUrl) setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                        if (currentImageUrl) return;
                        
                        if (e.dataTransfer.files.length > 1) {
                            handleBatchFileSelect(e.dataTransfer.files);
                        } else {
                            handleFileSelect(e.dataTransfer.files);
                        }
                    }}
                >
                    {/* Error Display */}
                    {error && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-800/80 border border-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-30 max-w-md w-full text-center animate-fade-in backdrop-blur-sm">
                            <p>{error}</p>
                            <button onClick={() => setError(null)} className="absolute top-1 right-2 text-2xl leading-none">&times;</button>
                        </div>
                    )}
                    
                    {currentImageUrl ? (
                        <div className="relative max-w-full max-h-full flex items-center justify-center">
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 gap-4 backdrop-blur-sm">
                                    <Spinner />
                                    <p className="text-lg font-semibold text-gray-200">Processing your image...</p>
                                </div>
                            )}

                            {!isLoading && (
                                isComparing && originalImageUrl ? (
                                    <ReactCompareSlider
                                        className="max-w-full max-h-full"
                                        itemOne={
                                            <div style={compareWrapperStyle}>
                                                <img src={originalImageUrl} alt="Original" className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
                                            </div>
                                        }
                                        itemTwo={
                                            <div style={compareWrapperStyle}>
                                                <img src={currentImageUrl} alt="Current" className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
                                            </div>
                                        }
                                    />
                                ) : (
                                    <div className="relative max-w-full max-h-full flex items-center justify-center">
                                        {(activeTool === 'crop' || activeTool === 'social' || activeTool === 'erase') ? (
                                            <ReactCrop
                                                crop={activeTool === 'erase' ? eraseSelection : crop}
                                                onChange={(_, percentCrop) => {
                                                    if (activeTool === 'erase') {
                                                        setEraseSelection(percentCrop);
                                                    } else {
                                                        setCrop(percentCrop);
                                                    }
                                                }}
                                                onComplete={(c) => {
                                                    if (activeTool === 'erase') {
                                                        setCompletedEraseSelection(c);
                                                    } else {
                                                        setCompletedCrop(c);
                                                    }
                                                }}
                                                aspect={activeTool === 'erase' ? undefined : cropAspect}
                                                className="max-w-full max-h-full"
                                            >
                                                <img
                                                    ref={imageRef}
                                                    src={showOriginal && originalImageUrl ? originalImageUrl : currentImageUrl}
                                                    alt="Editable image"
                                                    className="max-w-full max-h-full object-contain"
                                                    onLoad={onImageLoad}
                                                    crossOrigin="anonymous"
                                                />
                                            </ReactCrop>
                                        ) : (
                                            <div className="relative">
                                                <img
                                                    ref={imageRef}
                                                    src={showOriginal && originalImageUrl ? originalImageUrl : currentImageUrl}
                                                    alt="Editable image"
                                                    className="max-w-full max-h-full object-contain"
                                                    onClick={handleImageClick}
                                                    style={{ cursor: activeTool === 'retouch' ? 'crosshair' : 'default' }}
                                                    crossOrigin="anonymous"
                                                />
                                                 {hotspot && activeTool === 'retouch' && (
                                                    <div
                                                        className="absolute border-2 border-dashed border-amber-400 bg-amber-400/20 rounded-full pointer-events-none animate-pulse"
                                                        style={{
                                                            left: `calc(${(hotspot.x / (imageRef.current?.naturalWidth || 1)) * 100}% - ${hotspotRadius}px)`,
                                                            top: `calc(${(hotspot.y / (imageRef.current?.naturalHeight || 1)) * 100}% - ${hotspotRadius}px)`,
                                                            width: `${hotspotRadius * 2}px`,
                                                            height: `${hotspotRadius * 2}px`,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {activeTool === 'social' && socialText && (
                                            <div 
                                                ref={textOverlayRef}
                                                onMouseDown={handleTextMouseDown}
                                                className="absolute p-2 rounded-lg font-bold cursor-move select-none text-center"
                                                style={{
                                                    left: `${socialTextPosition.x}%`,
                                                    top: `${socialTextPosition.y}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    fontSize: `${socialFontSize}vw`,
                                                    fontFamily: socialFont,
                                                    color: socialColor,
                                                    textShadow: socialShadow,
                                                    width: '90%',
                                                }}
                                            >
                                                {socialText}
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        <div className={`text-center text-gray-400 flex flex-col items-center justify-center gap-6 p-8 rounded-2xl border-2 transition-all duration-300 ${isDraggingOver ? 'border-dashed border-amber-400' : 'border-transparent'}`}>
                            <img src="https://storage.googleapis.com/gemini-nano-banana/monster-on-banana.png" alt="Nano Banana Monster Studio mascot" className="w-40 h-auto drop-shadow-lg" />
                            <h2 className="text-3xl font-bold text-gray-200">AI Photo Editor</h2>
                            <p>Drag & drop an image, or use the buttons below to start.</p>
                            <div className="flex items-center gap-4 mt-4">
                                <label htmlFor="placeholder-upload-single" className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-base transition-colors text-white bg-amber-600 hover:bg-amber-500 font-semibold active:scale-95">
                                    <UploadIcon className="w-6 h-6"/> Upload Image
                                </label>
                                <input id="placeholder-upload-single" type="file" onChange={handleNewUpload} accept={SUPPORTED_MIME_TYPES.join(',')} className="hidden"/>

                                <label htmlFor="placeholder-upload-batch" className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-base transition-colors text-gray-200 bg-white/10 hover:bg-white/20 font-semibold active:scale-95">
                                    <StackIcon className="w-6 h-6"/> Upload Batch
                                </label>
                                <input id="placeholder-upload-batch" type="file" multiple onChange={(e) => handleBatchFileSelect(e.target.files)} accept={SUPPORTED_MIME_TYPES.join(',')} className="hidden"/>
                            </div>
                        </div>
                    )}
                </main>

                {/* Right Panel */}
                <aside className="w-96 bg-gray-900/50 border-l border-gray-700 p-4 flex flex-col items-center justify-center">
                    {!activeTool && <div className="text-gray-400 text-center">Select a tool from the left to begin editing.</div>}
                    {activeTool === 'retouch' && <RetouchPanel onApplyRetouch={handleApplyRetouch} isLoading={isLoading} radius={hotspotRadius} onRadiusChange={setHotspotRadius} isHotspotSet={!!hotspot} referenceImage={referenceImage} onReferenceImageChange={setReferenceImage} credits={credits} />}
                    {activeTool === 'erase' && <ErasePanel onApplyErase={handleApplyErase} isLoading={isLoading} isSelectionMade={!!(completedEraseSelection && completedEraseSelection.width > 0)} credits={credits}/>}
                    {activeTool === 'filter' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} credits={credits} />}
                    {activeTool === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} credits={credits} />}
                    {activeTool === 'colorize' && <ColorizePanel onApplyColorize={handleApplyColorize} onApplyRepair={handleApplyRepair} onApplyColorizeAndRepair={handleApplyColorizeAndRepair} isLoading={isLoading} credits={credits} />}
                    {activeTool === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={handleSetAspect} isLoading={isLoading} isCropping={!!completedCrop?.width} />}
                    {activeTool === 'background' && <BackgroundPanel onGenerateTransparentBackground={handleGenerateTransparentBg} onApplyBackgroundColor={handleApplyBackgroundColor} onApplyBackgroundImage={handleApplyBackgroundImage} isLoading={isLoading} credits={credits} />}
                    {activeTool === 'upscale' && <UpscalePanel onUpscaleImage={handleUpscaleImage} isLoading={isLoading} credits={credits}/>}
                    {activeTool === 'studio' && <ProductStudioPanel onApplyScene={handleApplyProductScene} isLoading={isLoading} credits={credits} />}
                    {activeTool === 'social' && (
                        <SocialPanel 
                            onApplySocialPost={handleApplySocialPost} 
                            onSetAspect={handleSetAspect} 
                            socialText={socialText} 
                            onSocialTextChange={setSocialText} 
                            isLoading={isLoading} 
                            isCropping={!!imageDimensions} 
                            onSuggestTitles={handleSuggestSocialTitles} 
                            isSuggestingTitles={isSuggestingTitles} 
                            titleSuggestions={socialTitleSuggestions}
                            socialFont={socialFont}
                            onSocialFontChange={setSocialFont}
                            socialColor={socialColor}
                            onSocialColorChange={setSocialColor}
                            socialShadow={socialShadow}
                            onSocialShadowChange={setSocialShadow}
                            socialFontSize={socialFontSize}
                            onSocialFontSizeChange={setSocialFontSize}
                            credits={credits}
                        />
                    )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 ease-in-out shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-1 active:scale-95 text-lg min-w-[180px]"
                  >
                    <UploadIcon className="w-6 h-6" />
                    Upload Image
                  </button>
                  
                  <button
                    onClick={() => batchFileInputRef.current?.click()}
                    className="flex items-center gap-3 bg-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 ease-in-out shadow-lg hover:bg-gray-600 hover:shadow-xl hover:-translate-y-1 active:scale-95 text-lg min-w-[180px]"
                  >
                    <StackIcon className="w-6 h-6" />
                    Upload Batch
                  </button>
                </div>
                </aside>
            </div>
            <DownloadModal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} onDownload={handleDownload} imageSrc={currentImageUrl} />
        </div>
    );
};

export default App;