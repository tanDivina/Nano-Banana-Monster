/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Part, Type } from "@google/genai";

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
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = Array.isArray(parts) ? parts.find(part => part.inlineData) : undefined;


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
    referenceImage: File | null,
    selection?: { x: number; y: number; width: number; height: number; },
    imageDimensions?: { width: number; height: number; } | null
): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const parts: Part[] = [imagePart];

    let fullPrompt = `You are a silent, expert photo editor. Your only output is the modified image.
**CRITICAL RULES:**
1.  **NO ANNOTATIONS:** You MUST NOT draw any shapes, circles, lines, borders, text, numbers, or any other kind of annotation on the image. The final image must be a clean photograph.
2.  **PHOTOREALISM:** All edits must be blended seamlessly and photorealistically into the surrounding image, matching the existing lighting, texture, and style.

The user wants to edit the image.
**User's Edit Instruction:** ${prompt.trim() ? `"${prompt}"` : 'Perform the edit based on the reference image provided.'}
`;

    if (selection?.width && selection?.height && imageDimensions) {
        const xPercent = ((selection.x / imageDimensions.width) * 100).toFixed(1);
        const yPercent = ((selection.y / imageDimensions.height) * 100).toFixed(1);
        const widthPercent = ((selection.width / imageDimensions.width) * 100).toFixed(1);
        const heightPercent = ((selection.height / imageDimensions.height) * 100).toFixed(1);

        fullPrompt += `
**Area of Focus:** The edit is confined to a rectangular region defined by percentages of the image dimensions, with (0%, 0%) being the top-left corner.
- **Region starts at:** ${xPercent}% from the left, ${yPercent}% from the top.
- **Region size is:** ${widthPercent}% of the image's width, ${heightPercent}% of the image's height.
**Reminder:** Your edit must stay within this region and blend perfectly. DO NOT draw the rectangle's border.`;

    } else if (hotspot && imageDimensions) {
        const xPercent = ((hotspot.x / imageDimensions.width) * 100).toFixed(1);
        const yPercent = ((hotspot.y / imageDimensions.height) * 100).toFixed(1);
        const radiusPercent = ((radius / imageDimensions.width) * 100).toFixed(1);

        fullPrompt += `
**Area of Focus:** The edit is centered on a specific point of interest, defined by percentages of the image dimensions, with (0%, 0%) being the top-left corner.
- **Center point is at:** ${xPercent}% from the left, ${yPercent}% from the top.
- **Affected area radius is roughly:** ${radiusPercent}% of the image's total width.
**Reminder:** The effect should be strongest at the center and fade out naturally. DO NOT draw a circle or marker on this point.`;
    } else {
        fullPrompt += `\n**Scope:** This is a global edit. Apply it to the whole image where relevant.`;
    }

    if (referenceImage) {
        const referenceImagePart = await fileToPart(referenceImage);
        parts.push(referenceImagePart);
        fullPrompt += `\n\n**Style Reference:** A second image is provided. Use it as a style reference for the edit.`;
        if (!prompt.trim()) {
            fullPrompt += ` Since there is no text prompt, replace the content in the area of focus with content from the reference image, blending it photorealistically.`;
        }
    }

    fullPrompt += `\n\n**Final Instruction:** Return only the edited photograph. It must be completely free of any drawn annotations.`;
    
    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "edit");
};

export const generateFilteredImage = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are a professional photo editing AI. Your task is to apply a filter or style to the provided image based on the user's request. **Your ONLY output must be the modified image.** Do not add text or any other elements unless explicitly asked.

**USER REQUEST:** Apply the following style: "${prompt}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "filter");
};

export const generateAdjustedImage = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are a professional photo editing AI. Your task is to perform a photorealistic adjustment to the provided image based on the user's request. Examples include changing lighting, enhancing details, or blurring the background. **Your ONLY output must be the modified image.**

**USER REQUEST:** Perform the following adjustment: "${prompt}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    return handleApiResponse(response, "adjustment");
};


export const generateTransparentBackground = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const promptPart = { text: "Remove the background from this image, leaving only the main subject with a transparent background. The output must be a PNG with a transparent background." };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, promptPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    return handleApiResponse(response, "background removal");
};


export const generateUpscaledImage = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const promptPart = { text: "Upscale this image to twice its original resolution. Enhance details and sharpness photorealistically. The output must have the exact same content and aspect ratio, just higher resolution." };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, promptPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "upscale");
};

export const generateProductScene = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are an expert product photography AI. Your task is to take the user's image, identify and isolate the main product, and then place it into a new, photorealistic scene based on the user's prompt.

**CRITICAL INSTRUCTIONS:**
1.  **Isolate Subject:** Perfectly identify and cut out the main product from its original background.
2.  **Generate Scene:** Create a new, high-quality, photorealistic background scene as described by the user's request.
3.  **Composite:** Place the isolated product into the generated scene. This is the most important step. You MUST apply realistic lighting, shadows, and perspective to the product so it looks completely natural in its new environment. The lighting on the product must match the lighting of the new scene.
4.  **Final Output:** Your ONLY output must be the final, composited image. Do not show the isolated product or the background alone. Do not add any text.

**USER SCENE REQUEST:** "${prompt}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "product scene");
};

export const generateColorizedImage = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are an expert photo restoration AI. Your task is to colorize the provided black and white, sepia, or faded image. Analyze the image content (e.g., clothing, environment, time period) to apply historically accurate and photorealistic colors. Enhance the image's dynamic range and details as part of the restoration process. Your ONLY output must be the fully colorized, restored image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "colorize");
};

export const generateRepairedImage = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are an expert photo restoration AI. Your task is to repair the provided image. Remove scratches, dust, tears, and other physical damage. Enhance clarity and restore faded details, but preserve the original colors (e.g., if it's black and white, keep it black and white). Your ONLY output must be the fully repaired image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "repair");
};

export const generateColorizedAndRepairedImage = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are an expert photo restoration AI. Your task is to fully restore the provided old, damaged, or faded photo. This involves two steps: first, repair all physical damage such as scratches, dust, and tears. Second, colorize the image with historically accurate and photorealistic colors. Enhance the image's dynamic range and details as part of the restoration process. Your ONLY output must be the fully repaired and colorized image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "colorize and repair");
};

export const generateSocialPostTitle = async (imageFile: File): Promise<string[]> => {
    const imagePart = await fileToPart(imageFile);
    const textPart = {
        text: `Analyze this image and suggest 5 catchy, short titles suitable for a YouTube thumbnail or Pinterest pin. The titles should be engaging and relevant to the image content. Keep them concise.`
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING
                        }
                    }
                },
                required: ["suggestions"]
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        if (result && Array.isArray(result.suggestions)) {
            return result.suggestions.slice(0, 5); // Ensure we only return 5
        }
        console.warn("AI returned valid JSON but 'suggestions' array is missing.", result);
        return [];
    } catch (e) {
        console.error("Failed to parse social title suggestions:", e, "Raw text:", response.text);
        throw new Error("The AI returned an unexpected format for title suggestions.");
    }
};