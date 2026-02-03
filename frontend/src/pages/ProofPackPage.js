import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CompactTimeline } from "../components/Timeline";
import { StatusBadge, SeverityBadge } from "../components/StatusBadge";
import { ErrorCard, LoadingCard } from "../components/ErrorStates";
import { Button } from "../components/ui/button";
import { apiRequest, CATEGORIES, formatDate, formatDateTime, getDaysIgnoredColor } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Share2,
  ExternalLink,
  TrendingUp,
  Merge,
  LogIn,
} from "lucide-react";

export default function ProofPackPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate the public URL for this proof pack
  const publicProofUrl = `${window.location.origin}/proof/${caseId}`;

  useEffect(() => {
    fetchProofPack();
  }, [caseId]);

  const fetchProofPack = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/proof/${caseId}`);
      setData(response);
    } catch (err) {
      setError(err.message || "Failed to load proof pack");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Proof pack link copied!");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadingCard message="Loading proof pack..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorCard title="Failed to load proof pack" message={error} onRetry={fetchProofPack} />
      </div>
    );
  }

  if (!data) return null;

  const { case: caseData, submissions, verifications, verificationCounts, supportersCount, mergeHistory, generatedAt } = data;
  const daysColor = getDaysIgnoredColor(caseData.daysIgnored);
  const totalVerifications = Object.values(verificationCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-white" data-testid="proof-pack-page">
      {/* Print Header - Only visible in print */}
      <div className="hidden print:block text-center py-6 border-b-4 border-primary mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary">CivicFix</h1>
        </div>
        <p className="text-sm text-slate-600">Official Civic Evidence Documentation</p>
        <p className="text-xs text-slate-400 mt-1">Generated: {formatDateTime(generatedAt)}</p>
      </div>

      {/* Action Bar - Hidden in print */}
      <div className="no-print sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Case
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare} data-testid="share-btn">
              <Share2 className="w-4 h-4 mr-2" />
              Share Link
            </Button>
            <Button onClick={handlePrint} data-testid="print-btn">
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="proof-pack max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 pb-6 border-b-2 border-slate-200">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap no-print">
                <StatusBadge status={caseData.status} />
                <SeverityBadge severity={caseData.severity} />
                {caseData.resolutionAttempts > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
                    {caseData.resolutionAttempts} Failed Resolution(s)
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                {caseData.title}
              </h1>
              <p className="text-sm text-slate-500 mb-1">
                <strong>Case ID:</strong> {caseData.id}
              </p>
              <p className="text-sm text-slate-500">
                <strong>Category:</strong> {CATEGORIES[caseData.category]?.label || caseData.category}
              </p>
            </div>
            
            {/* Days Ignored - Prominent */}
            <div className="text-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 min-w-[140px]">
              <p className={`text-5xl md:text-6xl font-black tracking-tighter ${daysColor}`}>
                {caseData.daysIgnored}
              </p>
              <p className="text-xs text-slate-600 uppercase tracking-wider font-bold mt-1">
                Days Ignored
              </p>
            </div>
          </div>

          {/* Status Banner for Print */}
          <div className="hidden print:block p-3 bg-slate-100 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status: <span className="uppercase">{caseData.status.replace('_', ' ')}</span></span>
              <span>Severity: {caseData.severity}/5</span>
            </div>
          </div>
        </div>

        {/* Neglect Scorecard */}
        <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-900">NEGLECT SCORECARD</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-orange-100">
              <p className={`text-3xl font-black ${daysColor}`}>{caseData.daysIgnored}</p>
              <p className="text-xs text-slate-600 uppercase">Days Open</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-orange-100">
              <p className="text-3xl font-black text-slate-900">{submissions.length}</p>
              <p className="text-xs text-slate-600 uppercase">Evidence</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-orange-100">
              <p className="text-3xl font-black text-slate-900">{supportersCount}</p>
              <p className="text-xs text-slate-600 uppercase">Supporters</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-orange-100">
              <p className={`text-3xl font-black ${caseData.resolutionAttempts > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                {caseData.resolutionAttempts || 0}
              </p>
              <p className="text-xs text-slate-600 uppercase">Failed Fixes</p>
            </div>
            <div className="text-center p-3 bg-orange-100 rounded-lg border border-orange-200">
              <p className="text-3xl font-black text-orange-600">{Math.round(caseData.neglectScore || 0)}</p>
              <p className="text-xs text-orange-700 uppercase font-medium">Score</p>
            </div>
          </div>
        </div>

        {/* Case Details */}
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Case Details
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-4 py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-500">First Reported</span>
              <span className="col-span-2">{formatDateTime(caseData.firstReportedAt)}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-500">Last Updated</span>
              <span className="col-span-2">{formatDateTime(caseData.updatedAt)}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-500">Description</span>
              <span className="col-span-2">{caseData.description}</span>
            </div>
            {caseData.harmTypes && caseData.harmTypes.length > 0 && (
              <div className="grid grid-cols-3 gap-4 py-2">
                <span className="font-semibold text-slate-500">Hazards</span>
                <span className="col-span-2">{caseData.harmTypes.map(h => h.replace('_', ' ')).join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Location
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg font-mono text-sm">
              <p className="mb-1"><strong>Latitude:</strong> {caseData.lat.toFixed(6)}</p>
              <p><strong>Longitude:</strong> {caseData.lng.toFixed(6)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-center">
              <a
                href={`https://www.openstreetmap.org/?mlat=${caseData.lat}&mlon=${caseData.lng}&zoom=16`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary flex items-center gap-1 no-print"
              >
                <ExternalLink className="w-4 h-4" />
                View on OpenStreetMap
              </a>
              <span className="hidden print:block text-xs text-slate-400">[See coordinates for map location]</span>
            </div>
          </div>
        </div>

        {/* Merged Reports */}
        {mergeHistory && mergeHistory.length > 0 && (
          <div className="mb-8 p-6 bg-purple-50 rounded-xl border border-purple-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Merge className="w-5 h-5 text-purple-600" />
              Merged Reports ({mergeHistory.length})
            </h2>
            <p className="text-sm text-purple-700 mb-3">
              Duplicate reports from nearby locations were merged to strengthen this case.
            </p>
            <div className="space-y-2">
              {mergeHistory.map((merge, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-purple-100">
                  <p className="font-medium text-sm">{merge.originalTitle}</p>
                  <p className="text-xs text-slate-500">{merge.distance}m away • {formatDate(merge.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Timeline */}
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200 print-break">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Evidence Timeline ({submissions.length} entries)
          </h2>
          <CompactTimeline submissions={submissions} />
        </div>

        {/* Verification Status */}
        {totalVerifications > 0 && (
          <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Resolution Verification
            </h2>
            
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-4 bg-green-50 rounded-lg text-center border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-green-700">{verificationCounts.FIXED || 0}</p>
                <p className="text-xs text-green-600 font-medium">Fixed</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center border border-red-200">
                <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-red-700">{verificationCounts.NOT_FIXED || 0}</p>
                <p className="text-xs text-red-600 font-medium">Not Fixed</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-amber-700">{verificationCounts.TEMPORARY || 0}</p>
                <p className="text-xs text-amber-600 font-medium">Temporary</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-200">
                <MinusCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-blue-700">{verificationCounts.PARTIAL || 0}</p>
                <p className="text-xs text-blue-600 font-medium">Partial</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p><strong>Verification Rules:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>≥3 citizen verifications required for closure</li>
                <li>Majority vote (50%+) determines final status</li>
                <li>Moderator can override with single decision</li>
              </ul>
            </div>
          </div>
        )}

        {/* QR Code & Verification Link */}
        <div className="mb-8 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                Verify This Report Online
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                Scan the QR code or visit the link below to view the live case and submit your verification.
              </p>
              <div className="p-2 bg-white rounded border border-slate-200 inline-block">
                <p className="text-xs font-mono text-primary break-all">
                  {publicProofUrl}
                </p>
              </div>
              {!user && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-700">
                    <button 
                      onClick={() => navigate('/login')} 
                      className="font-semibold underline hover:text-amber-900"
                    >
                      Login
                    </button>
                    {" "}to verify, support, or add evidence to this case.
                  </span>
                </div>
              )}
            </div>
            <div className="w-32 h-32 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center p-2" data-testid="qr-code-container">
              <QRCodeSVG 
                value={publicProofUrl}
                size={112}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#14532d"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-slate-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-bold text-slate-900">CivicFix</span>
          </div>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            This document serves as official evidence of civic neglect. 
            All data is sourced from citizen submissions, authority responses, and community verifications.
            Document generated on {formatDateTime(generatedAt)}.
          </p>
          <p className="text-[10px] text-slate-400 mt-4">
            Case ID: {caseData.id} | Supporters: {supportersCount} | Evidence Entries: {submissions.length}
          </p>
        </div>
      </div>
    </div>
  );
}
