/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Part, Type } from "@google/genai";

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });

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
    selection?: { x: number; y: number; width: number; height: number; }
): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const parts: Part[] = [imagePart];

    let fullPrompt = `**ABSOLUTE PRIMARY RULE:** Your only task is to output a modified image. It is strictly forbidden to draw any kind of shape, circle, border, or annotation on the output image to indicate the edited area. The output must be ONLY the clean, edited image.

You are a professional photo editing AI. You will be given a primary image and an instruction.

**USER INSTRUCTION:**
${prompt.trim() ? `"${prompt}"` : 'Perform the edit based on the reference image provided.'}
`;

    if (selection?.width && selection?.height) {
        fullPrompt += `\n\n**EDIT AREA:** The edit described above MUST be applied ONLY within the rectangular area defined by the top-left corner at coordinates (x: ${Math.round(selection.x)}, y: ${Math.round(selection.y)}) with a width of ${Math.round(selection.width)} pixels and a height of ${Math.round(selection.height)} pixels. Do not interpret these coordinates as an instruction to draw a rectangle. They only define the boundary of your edit. The edit must blend seamlessly and photorealistically with the surrounding, unmodified areas.`;
    } else if (hotspot) {
        fullPrompt += `\n\n**EDIT AREA:** The edit described above MUST be applied ONLY within a circular area of ${radius} pixels radius, centered at coordinates (x: ${hotspot.x}, y: ${hotspot.y}). Do not interpret these coordinates as an instruction to draw a circle. They only define the boundary of your edit. The edit must blend seamlessly and photorealistically with the surrounding, unmodified areas.`;
    } else {
        fullPrompt += `\n\n**EDIT AREA:** This is a global edit. Apply the instruction intelligently to the entire image where appropriate.`;
    }

    if (referenceImage) {
        const referenceImagePart = await fileToPart(referenceImage);
        parts.push(referenceImagePart);
        fullPrompt += `\n\n**REFERENCE IMAGE:** A reference image has been provided. 
- If a text prompt is also provided, use the reference image as a *style reference* for the edit described in the text.
- If no text prompt is provided, use the content from the reference image to *replace* the content in the primary image's edit area, blending it photorealistically.`;
    }
    
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