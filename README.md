# Nano Banana Monster

A powerful, AI-powered photo editor that allows you to retouch photos, apply creative filters, and make professional adjustments using simple text prompts.

## Features

- **Precise Retouching**: Click any point on your image to remove blemishes, change colors, or add elements with pinpoint accuracy
- **Creative Filters**: Transform photos with artistic styles from vintage looks to futuristic glows
- **Professional Adjustments**: Enhance lighting, blur backgrounds, or change the mood with studio-quality results
- **Batch Processing**: Edit multiple images at once with the same operations
- **Background Tools**: Remove backgrounds or replace them with solid colors or custom images
- **AI Product Studio**: Place products in new, AI-generated scenes
- **Social Media Tools**: Create optimized posts for different platforms with text overlays

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- A Gemini API key from Google AI Studio

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd nano-banana-monster
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Upload an Image**: Click "Upload an Image" or drag and drop a file onto the interface
2. **Choose a Tool**: Select from the available tools in the sidebar (Retouch, Filter, Adjust, etc.)
3. **Apply Edits**: Follow the tool-specific instructions to make your edits
4. **Download**: Save your edited image in PNG or JPEG format

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technologies Used

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Google Gemini AI
- React Image Crop
- IndexedDB for session storage

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.