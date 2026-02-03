import React from "react";
import { Card, CardContent } from "./ui/card";
import { Clock, Users, FileText, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { getDaysIgnoredColor } from "../lib/utils";

export const NeglectScorecard = ({ caseData, compact = false }) => {
  const daysColor = getDaysIgnoredColor(caseData.daysIgnored);
  
  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center">
          <p className={`text-2xl font-black ${daysColor}`}>{caseData.daysIgnored}</p>
          <p className="text-[10px] text-slate-500 uppercase">Days</p>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {caseData.submissionsCount}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {caseData.supportersCount}
          </span>
          {caseData.resolutionAttempts > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3 h-3" />
              {caseData.resolutionAttempts}
            </span>
          )}
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold text-orange-600">{Math.round(caseData.neglectScore || 0)}</p>
          <p className="text-[10px] text-slate-500 uppercase">Score</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="card-shadow border-2 border-slate-200">
      <CardContent className="p-0">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TrendingUp className="w-4 h-4 text-primary" />
            NEGLECT SCORECARD
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100">
          {/* Days Ignored - Most Prominent */}
          <div className="col-span-2 md:col-span-1 p-4 text-center bg-red-50/50">
            <p className={`text-4xl md:text-5xl font-black tracking-tighter ${daysColor}`}>
              {caseData.daysIgnored}
            </p>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mt-1">
              Days Ignored
            </p>
          </div>
          
          {/* Evidence Submissions */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{caseData.submissionsCount}</p>
            <p className="text-xs text-slate-500 uppercase">Evidence</p>
          </div>
          
          {/* Supporters */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{caseData.supportersCount}</p>
            <p className="text-xs text-slate-500 uppercase">Supporters</p>
          </div>
          
          {/* Resolution Attempts Failed */}
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <XCircle className="w-4 h-4" />
            </div>
            <p className={`text-2xl font-bold ${caseData.resolutionAttempts > 0 ? 'text-red-600' : 'text-slate-300'}`}>
              {caseData.resolutionAttempts || 0}
            </p>
            <p className="text-xs text-slate-500 uppercase">Failed Attempts</p>
          </div>
          
          {/* Neglect Score */}
          <div className="p-4 text-center bg-orange-50/50">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{Math.round(caseData.neglectScore || 0)}</p>
            <p className="text-xs text-slate-500 uppercase">Score</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TrustMeter = ({ trustMeter, status }) => {
  const { authorityMarkedResolved, citizenVerificationComplete, conflictingVotesDetected, totalVerifications, requiredVerifications } = trustMeter;
  
  const progress = Math.min((totalVerifications / requiredVerifications) * 100, 100);
  const isVerified = status === "verified_resolved";
  const isDisputed = status === "disputed";
  
  return (
    <Card className={`card-shadow ${isDisputed ? 'border-red-200 bg-red-50/30' : isVerified ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-1.5 rounded-full ${isDisputed ? 'bg-red-100' : isVerified ? 'bg-green-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`w-4 h-4 ${isDisputed ? 'text-red-600' : isVerified ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <h3 className="font-semibold text-slate-900">Resolution Trust Meter</h3>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Verification Progress</span>
            <span>{totalVerifications}/{requiredVerifications} votes</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isVerified ? 'bg-green-500' : isDisputed ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Trust Indicators */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Authority marked resolved</span>
            <span className={authorityMarkedResolved ? 'text-green-600 font-medium' : 'text-slate-400'}>
              {authorityMarkedResolved ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Citizen verification complete</span>
            <span className={citizenVerificationComplete ? 'text-green-600 font-medium' : 'text-slate-400'}>
              {citizenVerificationComplete ? '✓ Yes' : `✗ Need ${requiredVerifications - totalVerifications} more`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Conflicting votes detected</span>
            <span className={conflictingVotesDetected ? 'text-red-600 font-medium' : 'text-green-600'}>
              {conflictingVotesDetected ? '⚠ Yes' : '✓ No'}
            </span>
          </div>
        </div>
        
        {/* Message */}
        <div className={`mt-4 p-3 rounded-lg text-sm ${isVerified ? 'bg-green-100 text-green-800' : isDisputed ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
          {isVerified ? (
            <p className="font-medium">✓ Resolution verified by community</p>
          ) : isDisputed ? (
            <p className="font-medium">⚠ Resolution disputed - Issue not fixed</p>
          ) : (
            <p><strong>"Resolved" is not final until verified.</strong> Citizens must confirm the fix is real.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
