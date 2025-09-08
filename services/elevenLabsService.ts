/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    // The Cloud Function URL is a build-time environment variable, which is safe to expose.
    const cloudFunctionUrl = process.env.CLOUD_FUNCTION_URL;

    if (!cloudFunctionUrl) {
        throw new Error("Cloud Function URL is not configured. This is a deployment issue.");
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    try {
        const response = await fetch(cloudFunctionUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Transcription function Error:', errorBody);
            // Try to parse JSON error, otherwise return text
            try {
                const errorJson = JSON.parse(errorBody);
                throw new Error(errorJson.error || `Transcription failed with status ${response.status}`);
            } catch {
                throw new Error(`Transcription failed with status ${response.status}: ${errorBody}`);
            }
        }

        const result = await response.json();
        
        if (result && typeof result.text === 'string') {
            return result.text;
        } else {
            console.error('Transcription function returned an unexpected format:', result);
            throw new Error('Failed to transcribe audio: Invalid response from function.');
        }

    } catch (error) {
        console.error('Error during transcription:', error);
        if (error instanceof Error) {
            throw error; // Re-throw the specific error
        }
        throw new Error('Could not contact transcription service. Please check your connection.');
    }
};
