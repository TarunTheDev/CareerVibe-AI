"use client";

import React from 'react';
import { ArrowRight, Sparkles, TrendingUp, Crown, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function RightSidebarNew({
  view = 'home',
  matchData = null,
  profileStrength = 35,
  skillGaps = []
}) {
  // Home view sidebar
  if (view === 'home') {
    return (
      <div className="hidden xl:block w-80 shrink-0 space-y-6">
        {/* Profile Strength Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Profile Strength</h3>
          <div className="flex items-start gap-4 mt-3">
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  stroke="#22C55E"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={157}
                  strokeDashoffset={157 - (157 * profileStrength) / 100}
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>
              <span className="absolute text-xs font-bold text-gray-900">{profileStrength}%</span>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-gray-600 leading-relaxed">
                Your profile is missing some key information.
              </p>
              <button className="text-xs font-medium text-orange-500 mt-2 flex items-center gap-1 hover:text-orange-600 w-max transition-colors">
                Complete Profile <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* AI Tip Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-purple-500">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">AI Tip for You</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Complete your profile and upload your resume to get accurate job matches.
          </p>
          <button className="text-xs font-medium text-orange-500 mt-3 flex items-center gap-1 hover:text-orange-600 w-max transition-colors">
            See How It Works <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Career Coach Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center mb-2">
            <Sparkles className="w-4 h-4 text-green-500 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">AI Career Coach</h3>
            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full ml-auto">
              Free
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Ask anything about your career and get AI-powered guidance.
          </p>
          <button className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
            Start Chatting <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Top Roles Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Roles for You</h3>
          <ul className="space-y-3">
            <li className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Product Manager</span>
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                High Match
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Business Analyst</span>
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                High Match
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Project Manager</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                Good Match
              </span>
            </li>
          </ul>
          <button className="text-xs font-medium text-orange-500 mt-4 flex items-center gap-1 hover:text-orange-600 transition-colors w-max">
            View All Matches <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Jobs view sidebar
  const chartData = matchData || [
    { name: 'High Match', value: 12, color: '#22C55E' },
    { name: 'Good Match', value: 10, color: '#3B82F6' },
    { name: 'Fair Match', value: 6, color: '#A855F7' },
  ];

  const totalMatches = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="hidden xl:block w-80 shrink-0 space-y-6">
      {/* Your Match Overview Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Your Match Overview</h3>
          <Info className="w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-[100px] h-[100px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={48}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-900 leading-none">{totalMatches}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">Total Matches</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {chartData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600 truncate">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Progress Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <p className="text-xs text-gray-600">
          Apply to <span className="font-semibold text-gray-900">25</span> more jobs to unlock unlimited applications.
        </p>
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full" style={{ width: '20%' }}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>5 / 25 Applications Used</span>
        </div>
      </div>

      {/* Improve Your Match Score Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900">Improve Your Match Score</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">Key areas to improve for better job matches.</p>

        <div className="space-y-3 mt-4">
          {(skillGaps.length > 0 ? skillGaps : [
            { skill: 'A/B Testing', impact: 'High', boost: '+15%' },
            { skill: 'Data Analytics', impact: 'High', boost: '+12%' },
            { skill: 'Stakeholder Mgmt', impact: 'Medium', boost: '+8%' }
          ]).slice(0, 3).map((gap, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{gap.skill}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  gap.impact === 'High'
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-500 bg-gray-100'
                }`}>
                  {gap.impact} Impact
                </span>
                <span className="text-xs font-bold text-green-600">{gap.boost}</span>
              </div>
            </div>
          ))}
        </div>
        <button className="text-xs font-medium text-orange-500 mt-4 flex items-center gap-1 hover:text-orange-600 transition-colors w-max">
          View All Skill Gaps <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Unlock Premium Card */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900">Unlock Premium Benefits</h3>
        </div>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5 text-[10px]">✔</span>
            <span className="text-xs text-gray-600">Unlimited job matches</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5 text-[10px]">✔</span>
            <span className="text-xs text-gray-600">Advanced AI resume optimization</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5 text-[10px]">✔</span>
            <span className="text-xs text-gray-600">LinkedIn profile insights</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5 text-[10px]">✔</span>
            <span className="text-xs text-gray-600">Priority support</span>
          </li>
        </ul>
        <button className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
          Upgrade Now <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">Starting at ₹499/month</p>
      </div>
    </div>
  );
}
