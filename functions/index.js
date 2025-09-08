/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const functions = require('@google-cloud/functions-framework');
const cors = require('cors');
const Busboy = require('busboy');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Initialize CORS middleware.
// Allows all origins for simplicity, but in production, you should restrict this
// to your app's domain: `cors({ origin: 'https://your-app-domain.com' })`
const corsMiddleware = cors({ origin: true });
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

/**
 * HTTP Cloud Function to proxy requests to the ElevenLabs API.
 */
functions.http('transcribe', (req, res) => {
    // Wrap with CORS to allow requests from the frontend.
    corsMiddleware(req, res, () => {
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Method Not Allowed' });
        }

        // Retrieve the secret API key from the function's environment variables.
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            console.error('ElevenLabs API key is not configured in the function environment.');
            return res.status(500).send({ error: 'Server configuration error.' });
        }
        
        try {
            const busboy = Busboy({ headers: req.headers });

            // Listen for the file part in the multipart form data.
            busboy.on('file', (fieldname, file, { filename, mimeType }) => {
                // We only process the field named 'file'.
                if (fieldname === 'file') {
                    const formData = new FormData();
                    formData.append('file', file, { filename, contentType: mimeType });

                    // Call the ElevenLabs API with the file and the secret key.
                    fetch(ELEVENLABS_API_URL, {
                        method: 'POST',
                        headers: { 'xi-api-key': apiKey },
                        body: formData,
                    })
                    .then(async (apiRes) => {
                        const responseBody = await apiRes.text();
                        // Pass through the headers and status from the ElevenLabs response.
                        res.setHeader('Content-Type', apiRes.headers.get('content-type'));
                        res.status(apiRes.status).send(responseBody);
                    })
                    .catch(err => {
                        console.error('Error calling ElevenLabs API:', err);
                        res.status(500).send({ error: 'Error calling transcription service.' });
                    });
                }
            });
            
            // Pipe the incoming request into busboy for parsing.
            req.pipe(busboy);

        } catch (e) {
            console.error('Error processing request:', e);
            res.status(500).send({ error: 'Internal server error.' });
        }
    });
});
