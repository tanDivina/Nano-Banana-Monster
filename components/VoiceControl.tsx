/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/elevenLabsService';
import { interpretVoiceCommand, ParsedCommand } from '../services/geminiService';
import { MicrophoneIcon, StopIcon } from './icons';
import Spinner from './Spinner';

interface VoiceControlProps {
  onCommand: (command: ParsedCommand) => void;
  onStatusUpdate: (message: string) => void;
  disabled: boolean;
}

type VoiceStatus = 'idle' | 'listening' | 'transcribing' | 'interpreting' | 'error';

const VoiceControl: React.FC<VoiceControlProps> = ({ onCommand, onStatusUpdate, disabled }) => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleStartRecording = async () => {
    if (status !== 'idle') return;

    try {
      onStatusUpdate('Waiting for permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onStatusUpdate('Listening...');
      setStatus('listening');
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        // Once stopped, process the audio
        setStatus('transcribing');
        onStatusUpdate('Transcribing...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        try {
            const transcribedText = await transcribeAudio(audioBlob);
            if (!transcribedText.trim()) {
                onStatusUpdate('No speech detected.');
                setStatus('idle');
                setTimeout(() => onStatusUpdate(null), 2000);
                return;
            }

            onStatusUpdate('Interpreting...');
            setStatus('interpreting');
            const command = await interpretVoiceCommand(transcribedText);
            
            onStatusUpdate(`Command: ${command.tool}`);
            onCommand(command);
            
            setStatus('idle');
        } catch (error: any) {
            console.error('Voice command processing failed:', error);
            onStatusUpdate(`Error: ${error.message || 'Processing failed.'}`);
            setStatus('error');
            setTimeout(() => {
                setStatus('idle');
                onStatusUpdate(null);
            }, 3000); // Reset after showing error
        } finally {
            // Clean up the stream
            stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      onStatusUpdate('Microphone access denied.');
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        onStatusUpdate(null);
    }, 3000);
    }
  };

  const buttonContent = () => {
    switch (status) {
      case 'listening':
        return <StopIcon className="w-8 h-8 text-white" />;
      case 'transcribing':
      case 'interpreting':
        return <Spinner />;
      case 'error':
        return <span className="text-2xl font-bold">!</span>;
      default:
        return <MicrophoneIcon className="w-8 h-8 text-white" />;
    }
  };

  const buttonClasses = () => {
    let base = "fixed bottom-8 right-8 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none z-40";
    
    if (disabled && status === 'idle') {
      return `${base} bg-gray-600`;
    }

    switch (status) {
      case 'listening':
        return `${base} bg-red-600 animate-pulse`;
      case 'transcribing':
      case 'interpreting':
        return `${base} bg-blue-600`;
      case 'error':
        return `${base} bg-red-800`;
      default:
        return `${base} bg-gradient-to-br from-amber-600 to-amber-500`;
    }
  };

  return (
    <button
      onClick={status === 'listening' ? stopRecording : handleStartRecording}
      className={buttonClasses()}
      disabled={disabled && status === 'idle'}
      aria-label={status === 'listening' ? "Stop recording" : "Start voice command"}
    >
      {buttonContent()}
    </button>
  );
};

export default VoiceControl;
