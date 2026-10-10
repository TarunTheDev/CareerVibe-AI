"use client";

import React from 'react';
import { Upload, Linkedin, Lock, Search, BarChart3, Lightbulb, TrendingUp } from 'lucide-react';

export default function UploadScreen({ onFileSelect, onLinkedInImport, isDark = false }) {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full pb-10">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          Welcome to CareerVibe! <span className="ml-2">👋</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Let's kickstart your career journey with AI-powered insights and the best opportunities.
        </p>
      </div>

      {/* Upload Card */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Let's find your perfect match</h2>
        <p className="text-sm text-gray-500 mb-6">
          Upload your resume and our AI will find jobs that match your skills, experience and career goals.
        </p>

        <label className="block">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center hover:border-orange-300 hover:bg-orange-50/30 transition-colors cursor-pointer group">
            <Upload className="w-10 h-10 text-gray-400 group-hover:text-orange-500 transition-colors" />
            <span className="text-sm font-medium text-gray-900 mt-3">Upload your resume</span>
            <span className="text-xs text-gray-500 mt-1">PDF, DOCX (Max 5MB)</span>
          </div>
        </label>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={onLinkedInImport}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center"
          >
            <Linkedin className="w-4 h-4" />
            Import from LinkedIn
          </button>

          <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5" />
            Your data is secure and private
          </div>
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-4">What you'll get after upload</h3>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-start hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-3">
            <Search className="w-5 h-5 text-teal-600" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900">AI Job Matches</h4>
          <p className="text-xs text-gray-500 mt-1">Get highly relevant job matches instantly</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-start hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900">Match Score</h4>
          <p className="text-xs text-gray-500 mt-1">See how well you match for each role</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-start hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
            <Lightbulb className="w-5 h-5 text-orange-600" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900">Skill Gap Insights</h4>
          <p className="text-xs text-gray-500 mt-1">Discover skills to improve your match</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-start hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900">Career Guidance</h4>
          <p className="text-xs text-gray-500 mt-1">Personalized paths to grow your career</p>
        </div>
      </div>

      {/* Social Proof */}
      <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200 flex-wrap">
        <div className="flex -space-x-2">
          <img src="https://i.pravatar.cc/100?img=1" alt="User 1" className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
          <img src="https://i.pravatar.cc/100?img=2" alt="User 2" className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
          <img src="https://i.pravatar.cc/100?img=3" alt="User 3" className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
        </div>
        <div className="flex flex-col">
          <div className="flex gap-1 text-orange-400 mb-0.5">
            {[1,2,3,4,5].map(i => <span key={i} className="text-sm leading-none">★</span>)}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">Loved by 50,000+ professionals</span>
            <span className="text-xs text-gray-500">who found better opportunities with CareerVibe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
