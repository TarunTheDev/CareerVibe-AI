"use client";

import React, { useState } from 'react';
import { Sparkles, SlidersHorizontal, ChevronDown, Zap } from 'lucide-react';
import JobCardNew from './JobCardNew';

export default function JobsListView({
  jobs = [],
  onSaveJob,
  onViewDetails,
  savedJobs = []
}) {
  const [activeTab, setActiveTab] = useState('best');

  // Filter jobs by match score
  const bestMatches = jobs.filter(j => j.score >= 85);
  const highMatches = jobs.filter(j => j.score >= 70 && j.score < 85);
  const goodMatches = jobs.filter(j => j.score >= 60 && j.score < 70);

  const getDisplayJobs = () => {
    switch(activeTab) {
      case 'best': return bestMatches;
      case 'high': return highMatches;
      case 'good': return goodMatches;
      case 'all': return jobs;
      default: return bestMatches;
    }
  };

  const displayJobs = getDisplayJobs();

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          AI Job Match <Sparkles className="w-6 h-6 text-orange-500 fill-orange-500/20" />
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalized job matches based on your skills, experience and career goals.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('best')}
          className={`text-sm font-medium pb-3 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'best'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Best Matches ({bestMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('high')}
          className={`text-sm font-medium pb-3 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'high'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          High Match ({highMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('good')}
          className={`text-sm font-medium pb-3 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'good'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Good Match ({goodMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`text-sm font-medium pb-3 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Explore All
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <SlidersHorizontal className="w-4 h-4" />
          All Filters
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {['Experience', 'Location', 'Remote', 'Salary', 'Company Size'].map(filter => (
            <button key={filter} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
              {filter}
            </button>
          ))}
        </div>
        <div className="ml-auto text-sm text-gray-600 flex items-center gap-1 cursor-pointer hover:text-gray-900 transition-colors">
          Sort by: <span className="font-medium text-gray-900">Best Match</span> <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {displayJobs.length > 0 ? (
          displayJobs.map((job) => (
            <JobCardNew
              key={job.id}
              job={job}
              onSave={onSaveJob}
              onViewDetails={onViewDetails}
              isSaved={savedJobs.some(sj => sj.id === job.id)}
            />
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <p className="text-gray-500">No jobs found in this category.</p>
          </div>
        )}
      </div>

      {/* Bottom CTA Banner */}
      {displayJobs.length > 0 && (
        <div className="mt-8 bg-orange-50 border border-orange-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Zap className="w-6 h-6 text-orange-500 fill-orange-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Want even better matches?</h4>
              <p className="text-xs text-gray-500 mt-1">Optimize your resume to increase your match score and unlock more opportunities.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
            <span className="text-xs text-orange-600 font-medium">120 Credits</span>
            <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors w-full md:w-auto">
              Optimize Resume with AI <Sparkles className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
