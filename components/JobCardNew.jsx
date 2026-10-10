"use client";

import React from 'react';
import { Bookmark, CheckCircle2, ArrowRight, MapPin, Clock, DollarSign, ExternalLink } from 'lucide-react';

export default function JobCardNew({
  job,
  onSave,
  onViewDetails,
  isSaved = false
}) {
  const {
    title,
    company,
    location,
    type,
    level,
    salary,
    posted,
    applicants,
    description,
    score,
    logoUrl,
    logoColor = 'bg-blue-600',
    logoText,
    matchReasons = [],
    missingSkills = [],
    isFullTime = true,
    url
  } = job;

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getScoreStroke = (score) => {
    if (score >= 85) return '#22C55E';
    if (score >= 70) return '#F97316';
    return '#6B7280';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          {/* Company Logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={company}
              className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover shrink-0 border border-gray-200"
            />
          ) : (
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${logoColor} flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-sm shrink-0`}>
              {logoText || company.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-sm md:text-base font-semibold text-gray-900 truncate">{title}</h2>
            <div className="flex items-center gap-1.5 md:gap-2 mt-1 text-xs text-gray-500 flex-wrap">
              <span className="font-medium text-gray-900">{company}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location}
              </span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">{type}</span>
            </div>
          </div>
        </div>

        {/* Match Score - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end mr-3">
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}%</span>
              <div className="relative w-8 h-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="16" cy="16" r="14" stroke="#E5E7EB" strokeWidth="3" fill="transparent" />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    stroke={getScoreStroke(score)}
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={88}
                    strokeDashoffset={88 - (88 * score) / 100}
                  />
                </svg>
              </div>
            </div>
            <span className="text-xs text-gray-400 mt-1">Match Score</span>
          </div>
          <button
            onClick={() => onSave && onSave(job)}
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors group ${
              isSaved ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''} group-hover:text-gray-600`} />
          </button>
        </div>

        {/* Match Score - Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}%</span>
          <button
            onClick={() => onSave && onSave(job)}
            className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${
              isSaved ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Details Pills */}
      <div className="mt-3 md:mt-4 flex items-center gap-2 md:gap-3 text-xs text-gray-600 font-medium flex-wrap">
        {isFullTime && <span className="bg-gray-100 px-2 md:px-2.5 py-1 rounded-md">Full-time</span>}
        <span className="bg-gray-100 px-2 md:px-2.5 py-1 rounded-md">{level}</span>
        {salary && <span className="bg-gray-100 px-2 md:px-2.5 py-1 rounded-md">{salary}</span>}
      </div>

      {/* Description */}
      <p className="mt-3 text-xs md:text-sm text-gray-600 leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* Footer */}
      <div className="mt-3 md:mt-4 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Posted {posted}</span>
          {applicants && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{applicants}</span>
            </>
          )}
        </div>
        <button
          onClick={() => onViewDetails ? onViewDetails(job) : url && window.open(url, '_blank')}
          className="text-xs md:text-sm font-medium text-orange-500 flex items-center gap-1 hover:text-orange-600 transition-colors"
        >
          View Details <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Match Analysis */}
      {(matchReasons.length > 0 || missingSkills.length > 0) && (
        <div className="mt-4 md:mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {matchReasons.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-2">Why it's a match</h4>
              <ul className="space-y-1.5">
                {matchReasons.slice(0, 3).map((reason, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {missingSkills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-2">Missing Skills</h4>
              <div className="flex flex-wrap gap-2">
                {missingSkills.slice(0, 4).map((skill, i) => (
                  <span key={i} className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
