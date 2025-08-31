/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { RetouchIcon, BananaIcon } from './icons';

interface HeaderProps {
    credits: number;
    onRefillCredits: () => void;
}

const Header: React.FC<HeaderProps> = ({ credits, onRefillCredits }) => {
  const isLowOnCredits = credits <= 5;
  const isOutOfCredits = credits <= 0;

  return (
    <header className="w-full py-3 px-6 border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
          <RetouchIcon className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold tracking-tight text-gray-100">
            Nano Banana Monster
          </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${isLowOnCredits ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
            <BananaIcon className="w-5 h-5" />
            <span className="font-semibold text-sm">
                {credits} Credit{credits !== 1 ? 's' : ''}
            </span>
        </div>
        {isOutOfCredits && (
             <button onClick={onRefillCredits} className="bg-amber-500 text-white font-semibold text-sm px-3 py-1.5 rounded-full hover:bg-amber-400 transition-colors active:scale-95">
                Get More
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;