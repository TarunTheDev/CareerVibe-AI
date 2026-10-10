"use client";

import React, { useState, useRef } from 'react';
import { Search, Zap, Bell, ChevronDown, Menu, Sparkles, Home, TrendingUp, FileText, Briefcase, MessageSquare, User, Settings as SettingsIcon, Crown, CheckCircle2, ArrowRight, X } from 'lucide-react';
import Hotbar from '@/components/pixel/Hotbar';
import { McFace } from '@/components/pixel/McCharacter';

/**
 * ModernDashboardLayout - Integrates reference design with existing functionality
 * This wraps the existing app logic with the new UI from the reference designs
 */
export default function ModernDashboardLayout({
  // User and auth
  user,
  onSignOut,

  // Navigation
  activeTab,
  setActiveTab,
  onNavigate,

  // State
  profile,
  jobs,
  savedJobs,

  // Children (main content)
  children,

  // Theme
  isDark = false,
  toggleTheme,

  // Other props
  credits = 1000,
}) {
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [characterId, setCharacterId] = useState('explorer');
  const menuRef = useRef(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('cv_character');
      if (saved) setCharacterId(saved);
    } catch (_) {}
  }, []);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Navigation items matching reference design
  const navItems = [
    { name: 'Home', id: 'find', icon: Home },
    { name: 'AI Job Match', id: 'find', icon: Sparkles },
    { name: 'Career Growth', id: 'career', icon: TrendingUp },
    { name: 'Resume & LinkedIn Studio', id: 'resume', icon: FileText },
    { name: 'Applications', id: 'applied', icon: Briefcase },
    { name: 'AI Career Coach', id: 'coach', icon: MessageSquare, badge: 'Free' },
    { name: 'Profile', id: 'profile', icon: User, isRoute: true },
    { name: 'Settings', id: 'settings', icon: SettingsIcon, isRoute: true },
  ];

  const handleNavClick = (item) => {
    if (item.isRoute) {
      onNavigate?.(item.id);
    } else {
      setActiveTab?.(item.id);
    }
    setShowLeftDrawer(false);
  };

  const hotbarNavigate = (id) => {
    if (id === 'profile' || id === 'settings') onNavigate?.(id);
    else setActiveTab?.(id);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#1B1B1B' }}>
      {/* TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 md:px-6" style={{ background: '#2E2E2E', borderBottom: '4px solid #1A1410', boxShadow: '0 4px 0 #1A1410' }}>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setShowLeftDrawer(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => window.location.href = '/'}>
          <McFace id={characterId} size={28} style={{ border: '2px solid #1A1410', borderRadius: 3, marginRight: 8 }} />
          <span className="text-xl font-bold hidden sm:inline" style={{ color: '#EAD9B0', fontFamily: "'Press Start 2P', monospace", fontSize: '0.8rem' }}>CareerVibe</span>
        </div>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex w-full max-w-md items-center px-4 py-2 mx-4" style={{ background: '#3A3A3A', border: '3px solid #1A1410', boxShadow: 'inset 2px 2px 0 #4A4A4A', borderRadius: 3 }}>
          <Search className="w-4 h-4 mr-2 shrink-0" style={{ color: '#9A8C6C' }} />
          <input
            type="text"
            placeholder="Search for jobs, roles or companies..."
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: '#EAD9B0' }}
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Career Credits */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium" style={{ color: '#F5C542' }}>
            <Zap className="w-4 h-4" style={{ color: '#F5C542', fill: '#F5C542' }} />
            <span className="hidden lg:inline" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>{credits?.toLocaleString()}</span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 transition-colors" style={{ color: '#EAD9B0' }} aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 border-2" style={{ background: '#D8402E', borderColor: '#1A1410' }}></span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l outline-none rounded-lg transition-colors py-1 pr-2"
              style={{ borderColor: '#4A4A4A' }}
            >
              <div className="w-9 h-9 flex items-center justify-center" style={{ border: '3px solid #5DAA3A', borderRadius: 3, background: '#3A3A3A', imageRendering: 'pixelated' }}>
                <McFace id={characterId} size={32} />
              </div>
              <div className="hidden lg:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium" style={{ color: '#EAD9B0' }}>{displayName}</span>
                <span className="text-xs" style={{ color: '#9A8C6C' }}>Job Seeker</span>
              </div>
              <ChevronDown className="w-4 h-4 hidden md:block" style={{ color: '#9A8C6C' }} />
            </button>

            {/* Dropdown Menu */}
            {avatarMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 py-1 z-50" style={{ background: '#2E2E2E', border: '3px solid #1A1410', boxShadow: '4px 4px 0 #1A1410', borderRadius: 4 }}>
                <button
                  onClick={() => {
                    onNavigate?.('profile');
                    setAvatarMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2"
                  style={{ color: '#EAD9B0' }}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    onNavigate?.('settings');
                    setAvatarMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2"
                  style={{ color: '#EAD9B0' }}
                >
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </button>
                <hr className="my-1" style={{ borderColor: '#4A4A4A' }} />
                <button
                  onClick={() => {
                    onSignOut?.();
                    setAvatarMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2"
                  style={{ color: '#D8402E' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* LEFT SIDEBAR - Desktop */}
      <aside className="hidden lg:block fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] overflow-y-auto z-40" style={{ background: '#262626', borderRight: '4px solid #1A1410' }}>
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <div className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center px-3 py-2.5 transition-colors group ${
                    isActive
                      ? 'border-l-[3px]'
                      : 'border-l-[3px] border-transparent'
                  }`}
                  style={{
                    background: isActive ? '#5DAA3A' : 'transparent',
                    color: isActive ? '#0E2A06' : '#C9B98F',
                    borderColor: isActive ? '#3F7A27' : 'transparent',
                    borderRadius: 3,
                  }}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? '' : 'group-hover:text-gray-300'}`} style={{ color: isActive ? '#0E2A06' : '#9A8C6C' }} />
                  <span className="text-sm font-medium flex-1 text-left">{item.name}</span>
                  {item.badge && (
                    <span className="text-xs font-medium px-2 py-0.5 ml-auto" style={{ background: '#3DDC84', color: '#0E2A06', border: '2px solid #1A1410', borderRadius: 3 }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Premium Card */}
            <div className="mx-1 mt-4 p-4" style={{ background: '#2E2E2E', border: '3px solid #F5C542', boxShadow: '4px 4px 0 #1A1410', borderRadius: 4 }}>
              <div className="flex items-center text-sm font-semibold mb-3" style={{ color: '#F5C542' }}>
                <Crown className="w-4 h-4 mr-2" style={{ color: '#F5C542' }} />
                Upgrade for More Power
              </div>
              <ul className="space-y-2 text-xs mb-4" style={{ color: '#C9B98F' }}>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#3DDC84' }} />
                  <span>Unlimited AI Matches</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#3DDC84' }} />
                  <span>Advanced Resume Optimization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#3DDC84' }} />
                  <span>LinkedIn Profile Insights</span>
                </li>
              </ul>
              <button className="w-full text-sm font-medium py-2 flex items-center justify-center gap-2 transition-colors" style={{ background: '#5DAA3A', color: '#0E2A06', border: '3px solid #3F7A27', boxShadow: '3px 3px 0 #1A1410', borderRadius: 3, fontFamily: "'Press Start 2P', monospace", fontSize: '0.55rem' }}>
                Upgrade Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Career Growth Widget */}
          <div className="mt-auto p-4 border-t shrink-0" style={{ borderColor: '#4A4A4A' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#EAD9B0' }}>Your Career Growth</h3>
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-12 h-12">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="#3A3A3A" strokeWidth="8" fill="transparent" />
                  <circle cx="24" cy="24" r="20" stroke="#5DAA3A" strokeWidth="8" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * 35) / 100} className="transition-all duration-1000" />
                </svg>
                <span className="absolute text-xs font-bold" style={{ color: '#EAD9B0' }}>35%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs mb-1" style={{ color: '#9A8C6C' }}>Complete your profile</span>
                <button className="text-xs font-medium flex items-center gap-1 transition-colors" style={{ color: '#7BC850' }}>
                  Improve Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* LEFT SIDEBAR - Mobile Drawer */}
      {showLeftDrawer && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setShowLeftDrawer(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-80 z-50 lg:hidden overflow-y-auto" style={{ background: '#262626', borderRight: '4px solid #1A1410' }}>
            <div className="flex items-center justify-between px-6 h-16" style={{ borderBottom: '4px solid #1A1410' }}>
              <div className="flex items-center">
                <McFace id={characterId} size={26} style={{ border: '2px solid #1A1410', borderRadius: 3, marginRight: 8 }} />
                <span className="text-xl font-bold" style={{ color: '#EAD9B0', fontFamily: "'Press Start 2P', monospace", fontSize: '0.75rem' }}>CareerVibe</span>
              </div>
              <button onClick={() => setShowLeftDrawer(false)} className="p-2" style={{ color: '#EAD9B0' }} aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item)}
                    className="w-full flex items-center px-3 py-2.5 transition-colors"
                    style={{ background: isActive ? '#5DAA3A' : 'transparent', color: isActive ? '#0E2A06' : '#C9B98F', borderRadius: 3 }}
                  >
                    <Icon className="w-5 h-5 mr-3" style={{ color: isActive ? '#0E2A06' : '#9A8C6C' }} />
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="text-xs font-medium px-2 py-0.5 ml-auto" style={{ background: '#3DDC84', color: '#0E2A06', border: '2px solid #1A1410', borderRadius: 3 }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        </>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 mt-16 overflow-y-auto" style={{ background: '#1B1B1B', paddingBottom: '4.5rem' }}>
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Minecraft hotbar (mobile bottom nav) */}
      <Hotbar activeId={activeTab} onNavigate={hotbarNavigate} />
    </div>
  );
}
