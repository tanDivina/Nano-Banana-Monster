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
    const fullPrompt = `You are a professional photo editing AI. Your task is to apply a filter or style to the provided image based on the user's request.
**CRITICAL RULES:**
1.  **NO ANNOTATIONS:** You MUST NOT add any text, borders, or other annotations.
2.  **PRESERVE CONTENT:** Do not change the subject or content of the image. Only modify its style and aesthetic.

**User's Request:** "${prompt}"

Return only the edited photograph.`;

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
    const fullPrompt = `You are a professional photo editing AI. Your task is to perform a photorealistic adjustment to the provided image based on the user's request.
**CRITICAL RULES:**
1.  **NO ANNOTATIONS:** You MUST NOT add any text, borders, or other annotations.
2.  **SUBTLE CHANGES:** The adjustment should be subtle and photorealistic, enhancing the existing image rather than drastically changing it. Match the original lighting and perspective.

**User's Adjustment Request:** "${prompt}"

Return only the edited photograph.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "adjustment");
};

export const generateProductScene = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are a professional product photographer AI. The user has provided an image of a product, likely with a plain or transparent background. Your task is to place this product into a new, photorealistic scene based on the user's description.
**CRITICAL RULES:**
1.  **SEAMLESS INTEGRATION:** The product must be seamlessly integrated into the new scene. Pay close attention to lighting, shadows, reflections, and perspective to make it look completely natural.
2.  **MAINTAIN PRODUCT INTEGRITY:** Do not alter the product itself. The product from the original image should be perfectly preserved.
3.  **PHOTOREALISM:** The final image must be a high-quality, photorealistic photograph.

**User's Scene Description:** "${prompt}"

Return only the final composited photograph.`;

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
    const fullPrompt = `You are an expert in historical photo restoration. Your task is to colorize the provided black and white image.
**CRITICAL RULES:**
1.  **REALISTIC COLORS:** Apply historically accurate and realistic colors. Avoid oversaturation.
2.  **PRESERVE DETAILS:** Maintain all original details and textures of the photograph.
3.  **NO OTHER CHANGES:** Do not repair damage or make any other changes besides colorization.

Return only the colorized photograph.`;

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
    const fullPrompt = `You are an expert in photo restoration. Your task is to repair the damage in the provided photograph (e.g., scratches, tears, dust, fading).
**CRITICAL RULES:**
1.  **SEAMLESS REPAIR:** Inpaint the damaged areas seamlessly, matching the original texture, grain, and lighting.
2.  **PRESERVE ORIGINAL:** Do not change the content or colors of the image. Only repair the damage.
3.  **NATURAL RESULT:** The final image should look like a clean, undamaged version of the original.

Return only the repaired photograph.`;

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
    const fullPrompt = `You are an expert in historical photo restoration. Your task is to both repair damage (scratches, tears, etc.) and colorize the provided photograph.
**CRITICAL RULES:**
1.  **SEAMLESS REPAIR:** First, inpaint any damaged areas seamlessly.
2.  **REALISTIC COLORIZATION:** Then, apply historically accurate and realistic colors to the repaired image.
3.  **NATURAL RESULT:** The final image should look like a clean, undamaged, color photograph.

Return only the fully restored photograph.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "colorize and repair");
};

export const generateTransparentBackground = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are an expert photo editor. Your task is to remove the background from the provided image.
**CRITICAL RULES:**
1.  **PRECISE MASKING:** Create a clean, precise cutout of the main subject.
2.  **TRANSPARENT BACKGROUND:** The background MUST be fully transparent.
3.  **NO ADDITIONS:** Do not add any shadows, borders, or other effects.

Return only the image of the subject on a transparent background.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "transparent background");
};

export const generateUpscaledImage = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToPart(imageFile);
    const fullPrompt = `You are an AI image enhancement expert. Your task is to upscale the provided image, increasing its resolution and enhancing details.
**CRITICAL RULES:**
1.  **ENHANCE DETAILS:** Sharpen details and textures in a natural, photorealistic way. Do not over-sharpen.
2.  **INCREASE RESOLUTION:** Double the resolution of the image if possible.
3.  **NO ARTIFACTS:** Avoid introducing any AI-generated artifacts or distortion.

Return only the upscaled and enhanced photograph.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response, "upscale");
};

export const generateSocialPostTitle = async (imageFile: File): Promise<string[]> => {
    const imagePart = await fileToPart(imageFile);
    const prompt = `Analyze the provided image and generate 5 short, catchy, and engaging titles suitable for a social media post (like Instagram or Twitter). The titles should be relevant to the image content. The titles should be less than 10 words each.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    titles: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                            description: 'A catchy social media title.'
                        }
                    }
                },
                required: ['titles']
            },
        },
    });
    
    if (response.text) {
        try {
            const json = JSON.parse(response.text);
            if (json.titles && Array.isArray(json.titles)) {
                return json.titles.slice(0, 5);
            }
        } catch (e) {
            console.error("Failed to parse social title suggestions:", e);
            throw new Error("Could not generate social post titles. The model returned invalid JSON.");
        }
    }
    
    throw new Error("Could not generate social post titles. The model did not return any suggestions.");
};
