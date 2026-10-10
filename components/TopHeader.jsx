"use client";

import React, { useEffect, useState } from 'react';
import { Search, Zap, Bell, ChevronDown, Menu } from 'lucide-react';
import { McFace } from '@/components/pixel/McCharacter';

export default function TopHeader({
  user,
  credits = 1000,
  onMenuClick,
  onProfileClick
}) {
  const [characterId, setCharacterId] = useState('explorer');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cv_character');
      if (saved) setCharacterId(saved);
    } catch (_) {}
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Left: Search Bar */}
      <div className="hidden md:flex w-full max-w-md bg-gray-100 rounded-full items-center px-4 py-2">
        <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Search for jobs, roles or companies..."
          className="bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400 w-full"
        />
      </div>

      {/* Mobile: Just show logo */}
      <div className="md:hidden flex items-center">
        <span className="text-lg font-bold text-careervibe-orange">CareerVibe</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Career Credits */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span className="hidden lg:inline">{credits.toLocaleString()}</span>
          <span className="hidden xl:inline text-xs text-gray-500 ml-0.5">Career Credits</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* User Profile */}
        <button
          onClick={onProfileClick}
          className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-gray-200 outline-none hover:bg-gray-50 rounded-lg transition-colors py-1 pr-2"
        >
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-md overflow-hidden border-2 border-orange-400 bg-orange-50 flex items-center justify-center" style={{ imageRendering: 'pixelated' }}>
            <McFace id={characterId} size={36} />
          </div>
          <div className="hidden lg:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium text-gray-900">
              {user?.displayName || 'Alex Johnson'}
            </span>
            <span className="text-xs text-gray-500">Job Seeker</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
        </button>
      </div>
    </header>
  );
}
