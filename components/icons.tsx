/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

export const UndoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);

export const RedoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
  </svg>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

export const CompareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75v16.5" />
        <path d="M12 3.75a9 9 0 019 9h-9V3.75z" fill="currentColor" />
    </svg>
);

export const RetouchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 111.82 122.88" className={className} fill="currentColor">
        <g><path d="M35.77,66.33c3.6-1.88,7.42-3.18,11.39-3.81c4.86-0.77,9.92-0.52,15.04,0.92c1.92,0.54,3.82,1.47,5.71,2.39 c3.03,1.48,6.03,2.94,7.85,2.17c0.45-0.19,0.83-0.47,1.13-0.81c0.3-0.34,0.51-0.75,0.64-1.21c0.1-0.36,0.14-0.74,0.14-1.13 c-0.01-0.4-0.08-0.84-0.21-1.3c-0.29-1.03-1.13-2.32-2.15-3.62c-1.57-1.97-3.56-3.89-4.93-5.1c-3.16-2.78-6.8-5.1-10.67-6.49 c-3.39-1.22-6.97-1.74-10.57-1.25c-1.69,0.23-3.31,0.72-4.8,1.5c-1.38,0.73-2.65,1.72-3.77,3c-0.45,0.52-0.88,1.09-1.29,1.73 c-0.4,0.62-0.77,1.29-1.11,2.01c-1.01,2.13-1.62,4.48-1.99,6.9C35.97,63.59,35.84,64.97,35.77,66.33L35.77,66.33z M11.23,66.84 C9.52,62.25,8.12,57.51,7,52.66C5.71,47.12,4.79,41.42,4.2,35.63C3.77,31.35,3.06,23.4,3.91,16.2C4.84,8.42,7.58,1.48,14.33,0.19 c11.52-2.2,16.95,15.47,20.2,26.01c0.51,1.67,0.97,3.15,1.37,4.28c1.09,3.1,2.18,6.08,3.31,8.97c0.84,2.15,1.69,4.22,2.55,6.21 c0.26-0.16,0.52-0.3,0.79-0.45c1.89-1,3.94-1.62,6.07-1.91c4.24-0.58,8.43,0.03,12.37,1.45c4.37,1.57,8.43,4.15,11.92,7.21 c1.49,1.31,3.65,3.4,5.39,5.59c1.31,1.65,2.4,3.38,2.84,4.96c0.21,0.75,0.33,1.51,0.34,2.26c0.02,0.78-0.07,1.52-0.26,2.21 c-0.28,1.02-0.77,1.95-1.46,2.74c-0.66,0.75-1.51,1.37-2.53,1.8c-3.44,1.45-7.2-0.39-11.01-2.24c-1.75-0.85-3.51-1.71-5.07-2.15 c-2.61-0.73-5.2-1.12-7.74-1.19c3.5,4.4,7.51,8.27,12.31,11.76C71.6,81.95,78.64,85.63,87.35,89c1.21,0.47,2.53,0.96,3.94,1.46 c1.37,0.49,2.76,0.96,4.19,1.43l0.01,0l0,0c0.73,0.24,1.31,0.42,1.9,0.61c6.52,2.04,15.03,4.7,14.4,12.66 c-0.23,2.87-1.34,6.03-3.87,8.87c-2.01,2.25-4.91,4.28-8.97,5.75c-0.06,0.02-0.12,0.04-0.18,0.06l0,0 c-7.08,1.8-14.01,2.45-20.78,1.96c-6.78-0.48-13.39-2.1-19.84-4.8c-7.66-3.21-14.39-7.28-20.28-12.04 c-3.99-3.22-7.58-6.76-10.81-10.57c0.69,3.38,1.73,6.7,2.7,9.74c1.7,5.38,3.16,10.01,2.34,13.49c-0.04,0.17-0.1,0.37-0.17,0.58 c-0.78,2.31-2.65,3.65-4.82,4.28c-1.87,0.54-4.02,0.51-5.75,0.1c-0.28-0.07-0.58-0.15-0.88-0.26c-1.98-0.67-3.84-1.57-5.58-2.66 c-6.33-3.98-10.82-10.46-13.12-17.7c-2.29-7.2-2.42-15.17-0.04-22.18c0.72-2.13,1.69-4.18,2.89-6.1 C6.37,70.9,8.58,68.56,11.23,66.84L11.23,66.84z M38.64,48.08c-1.02-2.31-2.01-4.72-3-7.24c-1.11-2.84-2.22-5.88-3.35-9.1 c-0.43-1.21-0.89-2.72-1.41-4.42C28.01,18.01,23.2,2.39,15.05,3.95c-4.61,0.88-6.59,6.43-7.33,12.7 c-0.81,6.84-0.13,14.49,0.29,18.61c0.57,5.6,1.46,11.14,2.72,16.55c1.05,4.54,2.36,8.98,3.93,13.27c1.01-0.39,2.06-0.71,3.17-0.93 c4.12-0.84,8.86-0.44,14.14,1.64c0.08-1.37,0.22-2.75,0.43-4.12c0.42-2.74,1.14-5.45,2.32-7.96c0.41-0.88,0.86-1.69,1.35-2.45 c0.5-0.78,1.04-1.5,1.62-2.16C37.98,48.75,38.31,48.41,38.64,48.08L38.64,48.08z M26.3,87.23c3.95,5.44,8.58,10.4,13.97,14.75 c5.61,4.53,12.04,8.41,19.37,11.49c6.07,2.55,12.28,4.06,18.63,4.52c6.34,0.45,12.85-0.15,19.51-1.85c3.35-1.23,5.7-2.87,7.3-4.65 c0.55-0.62,1.01-1.26,1.39-1.9c-14.84,1.79-28.68-1.54-40.43-7.65c-14.1-7.34-25.21-18.71-31.46-30.1 C28.39,76.02,26.37,81.5,26.3,87.23L26.3,87.23z M107.9,105.53c0.03-0.23,0.06-0.45,0.07-0.67c0.39-4.91-6.47-7.06-11.72-8.7 c-0.75-0.23-1.47-0.46-1.96-0.62l0,0c-1.47-0.48-2.9-0.97-4.27-1.46c-1.33-0.47-2.68-0.97-4.05-1.51 c-9.04-3.5-16.36-7.34-22.48-11.78c-5.86-4.25-10.61-9.05-14.71-14.64c-0.35,0.04-0.7,0.09-1.04,0.15c-3.46,0.55-6.82,1.68-10,3.33 c5.88,10.9,16.51,21.85,30.07,28.9c11.57,6.02,25.26,9.19,39.91,7.02C107.78,105.54,107.84,105.54,107.9,105.53L107.9,105.53z M25.21,105.57c-3.51-11.13-8.04-25.47,4.08-35.7c-3.98-1.41-7.49-1.67-10.52-1.06c-4.34,0.89-7.76,3.64-10.12,7.4 c-1,1.59-1.8,3.3-2.41,5.1c-2.05,6.04-1.93,12.96,0.06,19.21c1.98,6.22,5.79,11.76,11.13,15.11c1.41,0.89,2.94,1.62,4.57,2.18 c0.12,0.04,0.27,0.08,0.45,0.13c1.02,0.24,2.27,0.26,3.35-0.05c0.78-0.22,1.42-0.62,1.62-1.22c0.01-0.02,0.02-0.07,0.04-0.15 C27.98,114.32,26.7,110.27,25.21,105.57L25.21,105.57z" /></g>
    </svg>
);

export const PaletteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zM6.5 12c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
);

export const CropIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5" />
    </svg>
);

export const BackgroundIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

export const UpscaleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
);

export const BananaIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12.78,2.32a1,1,0,0,0-1.56,0L8.27,6.86a1,1,0,0,0,0,1.56l3.22,3.22,0,0,1.56-1.56L9.83,7,12,4.88l3,3-4,4,.78.78,3.22,3.22a1,1,0,0,0,1.56,0l4.54-4.54a1,1,0,0,0,0-1.56Z" />
        <path d="M9.13,11.33l-1,1a5,5,0,0,0,0,7.07h0a5,5,0,0,0,7.07,0l1-1Z" />
    </svg>
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);