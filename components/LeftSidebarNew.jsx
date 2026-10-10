"use client";

import React from 'react';
import {
  Home,
  Sparkles,
  TrendingUp,
  FileText,
  Briefcase,
  MessageSquare,
  User,
  Settings,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Crown,
  X
} from 'lucide-react';

export default function LeftSidebarNew({
  activeView = 'home',
  onNavigate,
  onClose,
  isMobile = false,
  careerScore = 0
}) {
  const navItems = [
    { name: 'Home', id: 'home', icon: Home },
    { name: 'AI Job Match', id: 'jobs', icon: Sparkles },
    { name: 'Career Growth', id: 'career', icon: TrendingUp, hasDropdown: true },
    { name: 'Resume & LinkedIn Studio', id: 'resume', icon: FileText, hasDropdown: true },
    { name: 'Applications', id: 'applications', icon: Briefcase },
    { name: 'AI Career Coach', id: 'coach', icon: MessageSquare, badge: 'Free' },
    { name: 'Profile', id: 'profile', icon: User },
    { name: 'Settings', id: 'settings', icon: Settings },
  ];

  const handleNavClick = (id) => {
    if (onNavigate) {
      onNavigate(id);
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div className={`${isMobile ? 'w-full' : 'w-64'} h-full bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto`}>
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 shrink-0">
        <div className="flex items-center">
          <Sparkles className="text-orange-500 w-6 h-6 mr-2" />
          <span className="text-xl font-bold text-gray-900">CareerVibe</span>
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors group ${
                isActive
                  ? 'bg-orange-50 text-orange-600 border-l-[3px] border-orange-500'
                  : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent'
              }`}
            >
              <item.icon
                className={`w-5 h-5 mr-3 ${
                  isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              <span className="text-sm font-medium flex-1 text-left">{item.name}</span>
              {item.badge && (
                <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full ml-auto">
                  {item.badge}
                </span>
              )}
              {item.hasDropdown && (
                <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
              )}
            </button>
          );
        })}

        {/* Premium Card */}
        <div className="mx-1 mt-4 p-4 rounded-xl border border-orange-200 bg-orange-50/50">
          <div className="flex items-center text-sm font-semibold text-gray-900 mb-3">
            <Crown className="w-4 h-4 text-orange-500 mr-2" />
            Upgrade for More Power
          </div>
          <ul className="space-y-2 text-xs text-gray-600 mb-4">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
              <span>Unlimited AI Matches</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
              <span>Advanced Resume Optimization</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
              <span>LinkedIn Profile Insights</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
              <span>Priority Career Support</span>
            </li>
          </ul>
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
            Upgrade Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Career Growth Widget */}
      <div className="mt-auto p-4 border-t border-gray-200 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Career Growth</h3>
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-12 h-12">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="#E5E7EB"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="#22C55E"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (125.6 * careerScore) / 100}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute text-xs font-bold text-gray-900">{careerScore}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Complete your profile</span>
            <button className="text-xs text-orange-500 font-medium flex items-center gap-1 hover:text-orange-600 transition-colors">
              Improve Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
