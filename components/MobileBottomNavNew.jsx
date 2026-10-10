"use client";

import React from 'react';
import { Home, Search, TrendingUp, Heart, User } from 'lucide-react';

export default function MobileBottomNavNew({ activeView = 'home', onNavigate }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'jobs', label: 'Jobs', icon: Search },
    { id: 'career', label: 'Career', icon: TrendingUp },
    { id: 'saved', label: 'Saved', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate && onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                isActive ? 'text-orange-500' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-gray-500'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-orange-500' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
