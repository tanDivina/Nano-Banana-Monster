/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface CursorPosition {
  x: number;
  y: number;
}

const DynamicCursor: React.FC = () => {
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateCursorPosition = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('button, a, [role="button"], .cursor-pointer')) {
        setIsHovering(true);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('button, a, [role="button"], .cursor-pointer')) {
        setIsHovering(false);
      }
    };

    document.addEventListener('mousemove', updateCursorPosition);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', updateCursorPosition);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Main cursor */}
      <div
        className={`fixed pointer-events-none z-[9999] transition-all duration-200 ease-out ${
          isClicking ? 'scale-75' : isHovering ? 'scale-125' : 'scale-100'
        }`}
        style={{
          left: cursorPosition.x - 16,
          top: cursorPosition.y - 16,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.75 : isHovering ? 1.25 : 1})`,
        }}
      >
        <div className="text-3xl animate-bounce">🍌</div>
      </div>

      {/* Cursor trail */}
      <div
        className="fixed pointer-events-none z-[9998] w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 transition-all duration-300 ease-out"
        style={{
          left: cursorPosition.x - 16,
          top: cursorPosition.y - 16,
          transform: `translate(-50%, -50%) scale(${isHovering ? 1.5 : 1})`,
        }}
      />

      {/* Cursor glow */}
      <div
        className="fixed pointer-events-none z-[9997] w-12 h-12 rounded-full bg-yellow-300 opacity-10 blur-md transition-all duration-500 ease-out"
        style={{
          left: cursorPosition.x - 24,
          top: cursorPosition.y - 24,
          transform: `translate(-50%, -50%) scale(${isClicking ? 2 : 1})`,
        }}
      />
    </>
  );
};

export default DynamicCursor;