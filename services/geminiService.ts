/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Part } from "@google/genai";

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked due to ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Check for other non-STOP finish reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== "STOP") {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    // 3. Find the first image part in the response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePart?.inlineData?.data) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    // 4. If no image is found, throw an error
    const errorMessage = `Could not generate image for ${context}. The model did not return an image.`;
    console.error(errorMessage, { response });
    throw new Error(errorMessage);
};

// Main functions for image generation

export const generateEditedImage = async (
    imageFile: File,
    prompt: string,
    hotspot: { x: number; y: number } | null,
    radius: number,
    referenceImage: File | null
): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    
    const parts: Part[] = [imagePart];

    let fullPrompt = `Task: Perform an edit on the image based on the user's instructions. It is crucial to maintain the original image's quality, sharpness, and detail. Avoid introducing any compression artifacts or unnecessarily changing unmodified areas.`;

    if (hotspot) {
        fullPrompt += `\n\nThis is a precise, in-place edit. Focus the changes within a circular area of ${radius} pixels radius, centered at coordinates (x: ${hotspot.x}, y: ${hotspot.y}). Edits must blend seamlessly with the rest of the image.`;
    } else {
        fullPrompt += `\n\nThis is a global edit. Intelligently apply the user's instruction to the entire image where appropriate.`;
    }

    if (prompt) {
        fullPrompt += `\n\nUser's instruction: "${prompt}"`;
    }

    if (referenceImage) {
        const referenceImagePart = await fileToPart(referenceImage);
        parts.push(referenceImagePart);
        fullPrompt += `\n\nUse the second uploaded image as a style or content reference for the edit.`;
    }
    
    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, 'retouch');
};


export const generateFilteredImage = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `Apply the following artistic filter to the entire image: "${prompt}". It is crucial to preserve the original image's quality, details, and resolution. Avoid introducing compression artifacts. The output should be only the modified image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, 'filter');
};


export const generateAdjustedImage = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `Apply the following professional photo adjustment to the image: "${prompt}". It is crucial to preserve the original image's quality, details, and resolution. Avoid introducing compression artifacts. The output should be only the modified image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, 'adjustment');
};


export const generateTransparentBackground = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const prompt = "Please segment the main subject from the background. Make the background transparent. Preserve the quality and fine details of the subject, especially around the edges like hair or fur. The output should be a PNG with a transparent background.";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, 'background removal');
};

export const generateUpscaledImage = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const prompt = "Upscale this image to twice its original resolution (2x). Enhance the details and sharpness naturally during the upscaling process. It is crucial to preserve the original image's quality and avoid introducing any artifacts. The output should be only the upscaled image.";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, 'upscaling');
};