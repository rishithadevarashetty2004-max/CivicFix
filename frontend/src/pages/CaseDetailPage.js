import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Timeline } from "../components/Timeline";
import { MiniMapView } from "../components/MapView";
import { StatusBadge, SeverityBadge } from "../components/StatusBadge";
import { NeglectScorecard, TrustMeter } from "../components/NeglectScorecard";
import { ErrorCard, LoadingCard } from "../components/ErrorStates";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { apiRequest, CATEGORIES, formatDate, getDaysIgnoredColor } from "../lib/utils";
import { toast } from "sonner";
import {
  Clock,
  Users,
  FileText,
  MapPin,
  Plus,
  Heart,
  Printer,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MinusCircle,
  ArrowLeft,
  Loader2,
  Share2,
  Merge,
} from "lucide-react";

const verifyOptions = [
  {
    value: "FIXED",
    label: "Fixed",
    description: "Issue completely resolved",
    icon: CheckCircle,
    className: "verify-fixed",
  },
  {
    value: "NOT_FIXED",
    label: "Not Fixed",
    description: "Issue still exists",
    icon: XCircle,
    className: "verify-not-fixed",
  },
  {
    value: "TEMPORARY",
    label: "Temporary",
    description: "Quick fix, likely to recur",
    icon: AlertTriangle,
    className: "verify-temporary",
  },
  {
    value: "PARTIAL",
    label: "Partial",
    description: "Only partially addressed",
    icon: MinusCircle,
    className: "verify-partial",
  },
];

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [verificationCounts, setVerificationCounts] = useState({});
  const [supporters, setSupporters] = useState([]);
  const [mergeHistory, setMergeHistory] = useState([]);
  const [trustMeter, setTrustMeter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supporting, setSupporting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    fetchCase();
  }, [id]);

  const fetchCase = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/cases/${id}`);
      setCaseData(data.case);
      setSubmissions(data.submissions || []);
      setVerifications(data.verifications || []);
      setVerificationCounts(data.verificationCounts || {});
      setSupporters(data.supporters || []);
      setMergeHistory(data.mergeHistory || []);
      setTrustMeter(data.trustMeter || null);

      if (user) {
        setIsSupporter(data.supporters?.some((s) => s.userId === user.id) || false);
        setHasVerified(data.verifications?.some((v) => v.userId === user.id) || false);
      }
    } catch (err) {
      setError(err.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  const handleSupport = async () => {
    if (!user) {
      toast.error("Please login to support this case");
      navigate("/login");
      return;
    }

    setSupporting(true);
    try {
      const data = await apiRequest(`/cases/${id}/support`, { method: "POST" });
      setIsSupporter(data.supported);
      toast.success(data.supported ? "You're now supporting this case!" : "Support removed");
      fetchCase();
    } catch (err) {
      toast.error(err.message || "Failed to update support");
    } finally {
      setSupporting(false);
    }
  };

  const handleVerify = async () => {
    if (!user) {
      toast.error("Please login to verify");
      navigate("/login");
      return;
    }

    if (!selectedVerification) {
      toast.error("Please select a verification option");
      return;
    }

    setVerifying(true);
    try {
      const result = await apiRequest(`/cases/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ vote: selectedVerification }),
      });
      toast.success(`Verification submitted! Status: ${result.newStatus}`);
      setHasVerified(true);
      fetchCase();
    } catch (err) {
      toast.error(err.message || "Failed to submit verification");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorCard title="Failed to load case" message={error} onRetry={fetchCase} />
      </div>
    );
  }

  if (!caseData) return null;

  const daysColor = getDaysIgnoredColor(caseData.daysIgnored);
  const totalVerifications = Object.values(verificationCounts).reduce((a, b) => a + b, 0);
  const showVerification = caseData.status === "resolved_pending" || caseData.status === "disputed";

  return (
    <div className="min-h-screen bg-slate-50 pb-12" data-testid="case-detail-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500">
              Case ID: {caseData.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <StatusBadge status={caseData.status} />
                <SeverityBadge severity={caseData.severity} />
                {caseData.resolutionAttempts > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    {caseData.resolutionAttempts} failed resolution{caseData.resolutionAttempts > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                {caseData.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {CATEGORIES[caseData.category]?.label || caseData.category}
                </span>
                <span>Reported {formatDate(caseData.firstReportedAt)}</span>
              </div>
            </div>

            {/* Days Ignored - Prominent */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className={`text-5xl md:text-6xl font-black tracking-tighter ${daysColor}`} data-testid="days-ignored-display">
                {caseData.daysIgnored}
              </p>
              <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">
                Days Ignored
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Neglect Scorecard */}
            <NeglectScorecard caseData={caseData} />

            {/* Description */}
            <Card className="card-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{caseData.description}</p>
                {caseData.harmTypes && caseData.harmTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {caseData.harmTypes.map((harm) => (
                      <span
                        key={harm}
                        className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200"
                      >
                        {harm.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Merge History - if exists */}
            {mergeHistory.length > 0 && (
              <Card className="card-shadow border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                    <Merge className="w-5 h-5" />
                    Merged Reports ({mergeHistory.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-600 mb-3">
                    This case includes merged reports from nearby locations to prevent duplicates.
                  </p>
                  <div className="space-y-2">
                    {mergeHistory.map((merge, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-purple-100 text-sm">
                        <span className="font-medium">{merge.originalTitle}</span>
                        <span className="text-slate-400 ml-2">({merge.distance}m away)</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card className="card-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Evidence Timeline ({submissions.length})
                  </CardTitle>
                  {user && (
                    <Link to={`/cases/${id}/followup`}>
                      <Button size="sm" data-testid="add-followup-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Evidence
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Timeline submissions={submissions} />
              </CardContent>
            </Card>

            {/* Trust Meter - for pending/disputed cases */}
            {trustMeter && (caseData.status === "resolved_pending" || caseData.status === "disputed" || caseData.status === "verified_resolved") && (
              <TrustMeter trustMeter={trustMeter} status={caseData.status} />
            )}

            {/* Verification Section */}
            {showVerification && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="card-shadow border-2 border-amber-300 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="w-5 h-5" />
                      Citizen Verification Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-amber-700 mb-4">
                      Authority marked this case as resolved. Help verify if the issue is actually fixed.
                      <strong> Need {Math.max(0, 3 - totalVerifications)} more verification(s).</strong>
                    </p>

                    {/* Current Votes */}
                    {totalVerifications > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        {verifyOptions.map((opt) => (
                          <div key={opt.value} className="text-center p-2 bg-white rounded border">
                            <p className="text-lg font-bold">{verificationCounts[opt.value] || 0}</p>
                            <p className="text-xs text-slate-500">{opt.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Verification Options */}
                    {user && !hasVerified && (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {verifyOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setSelectedVerification(opt.value)}
                              className={`verify-btn ${opt.className} ${
                                selectedVerification === opt.value ? "selected" : ""
                              }`}
                              data-testid={`verify-${opt.value.toLowerCase()}-btn`}
                            >
                              <opt.icon className="w-6 h-6 mb-2" />
                              <span className="font-medium text-sm">{opt.label}</span>
                              <span className="text-[10px] opacity-70 text-center mt-1">
                                {opt.description}
                              </span>
                            </button>
                          ))}
                        </div>
                        <Button
                          onClick={handleVerify}
                          disabled={verifying || !selectedVerification}
                          className="w-full"
                          data-testid="submit-verification-btn"
                        >
                          {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Submit Verification
                        </Button>
                      </>
                    )}

                    {hasVerified && (
                      <p className="text-center text-sm text-green-600 font-medium">
                        ✓ You have already verified this case
                      </p>
                    )}

                    {!user && (
                      <Link to="/login">
                        <Button className="w-full">Login to Verify</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Map */}
            <Card className="card-shadow overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MiniMapView lat={caseData.lat} lng={caseData.lng} className="rounded-none" />
                <div className="p-4 text-sm text-slate-500">
                  {caseData.lat.toFixed(6)}, {caseData.lng.toFixed(6)}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="card-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant={isSupporter ? "default" : "outline"}
                  className="w-full"
                  onClick={handleSupport}
                  disabled={supporting}
                  data-testid="support-btn"
                >
                  {supporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Heart className={`w-4 h-4 mr-2 ${isSupporter ? "fill-current" : ""}`} />
                  )}
                  {isSupporter ? "Supporting" : "Support Case"}
                </Button>

                <Link to={`/proof/${caseData.id}`} className="block">
                  <Button variant="outline" className="w-full" data-testid="proof-pack-btn">
                    <Printer className="w-4 h-4 mr-2" />
                    Generate Proof Pack
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }}
                  data-testid="share-btn"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Case
                </Button>
              </CardContent>
            </Card>

            {/* Supporters */}
            <Card className="card-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Supporters ({caseData.supportersCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {[...Array(Math.min(caseData.supportersCount, 20))].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary"
                    >
                      C
                    </div>
                  ))}
                  {caseData.supportersCount > 20 && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                      +{caseData.supportersCount - 20}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
