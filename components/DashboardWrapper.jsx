"use client";

import React, { useState } from 'react';
import TopHeader from './TopHeader';
import LeftSidebarNew from './LeftSidebarNew';
import RightSidebarNew from './RightSidebarNew';
import MobileBottomNavNew from './MobileBottomNavNew';

/**
 * DashboardWrapper - New UI layout wrapper
 * Provides the 3-column layout: LeftSidebar + Main Content + RightSidebar
 */
export default function DashboardWrapper({
  user,
  children,
  activeView = 'home',
  onNavigate,
  showRightSidebar = true,
  rightSidebarView = 'home',
  matchData = null,
  profileStrength = 35,
  skillGaps = [],
  careerScore = 0
}) {
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Desktop */}
      <div className="hidden lg:block">
        <LeftSidebarNew
          activeView={activeView}
          onNavigate={onNavigate}
          careerScore={careerScore}
        />
      </div>

      {/* Left Sidebar - Mobile Drawer */}
      {showLeftDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setShowLeftDrawer(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
            <LeftSidebarNew
              activeView={activeView}
              onNavigate={onNavigate}
              onClose={() => setShowLeftDrawer(false)}
              isMobile={true}
              careerScore={careerScore}
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Header */}
        <TopHeader
          user={user}
          credits={1000}
          onMenuClick={() => setShowLeftDrawer(true)}
          onProfileClick={() => {}}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {/* Right Sidebar - Desktop */}
            {showRightSidebar && (
              <div className="hidden xl:block">
                <RightSidebarNew
                  view={rightSidebarView}
                  matchData={matchData}
                  profileStrength={profileStrength}
                  skillGaps={skillGaps}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavNew
        activeView={activeView}
        onNavigate={onNavigate}
      />
    </div>
  );
}
