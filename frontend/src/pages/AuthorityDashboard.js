import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CaseCard } from "../components/CaseCard";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Skeleton } from "../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { apiRequest, CATEGORIES, STATUS_LABELS } from "../lib/utils";
import { toast } from "sonner";
import {
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Upload,
  RefreshCw,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export default function AuthorityDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [resolveForm, setResolveForm] = useState({
    note: "",
    photoUrl: null,
  });

  useEffect(() => {
    if (!user || (user.role !== "authority" && user.role !== "moderator")) {
      toast.error("Access denied. Authority role required.");
      navigate("/");
      return;
    }
    fetchCases();
  }, [user, navigate]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/authority/cases");
      setCases(data.cases || []);
    } catch (error) {
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const data = await apiRequest("/upload", {
        method: "POST",
        body: form,
      });

      setResolveForm((prev) => ({ ...prev, photoUrl: data.url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveForm.note) {
      toast.error("Please provide a resolution note");
      return;
    }

    setResolving(true);
    try {
      await apiRequest(`/cases/${selectedCase.id}/resolve`, {
        method: "POST",
        body: JSON.stringify(resolveForm),
      });

      toast.success("Case marked as resolved. Pending citizen verification.");
      setResolveDialogOpen(false);
      setSelectedCase(null);
      setResolveForm({ note: "", photoUrl: null });
      fetchCases();
    } catch (error) {
      toast.error(error.message || "Failed to resolve case");
    } finally {
      setResolving(false);
    }
  };

  const handleStatusUpdate = async (caseId, status) => {
    try {
      const formData = new FormData();
      formData.append("status", status);

      await apiRequest(`/cases/${caseId}/status`, {
        method: "POST",
        body: formData,
      });

      toast.success("Status updated");
      fetchCases();
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const openCases = cases.filter((c) => c.status === "open");
  const inProgressCases = cases.filter((c) => c.status === "in_progress");
  const disputedCases = cases.filter((c) => c.status === "disputed");

  return (
    <div className="min-h-screen bg-slate-50" data-testid="authority-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Authority Dashboard
                </h1>
                <p className="text-sm text-slate-500">
                  Manage and resolve civic issues
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                  variant="outline"
                  onClick={() => navigate("/analytics")}
                  data-testid="analytics-btn"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>

              <Button
                  variant="outline"
                  onClick={fetchCases}
                  disabled={loading}
                  data-testid="refresh-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Pending</p>
                  <p className="text-3xl font-bold text-slate-900">{cases.length}</p>
                </div>
                <Clock className="w-8 h-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Open Cases</p>
                  <p className="text-3xl font-bold text-amber-600">{openCases.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{inProgressCases.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Disputed</p>
                  <p className="text-3xl font-bold text-red-600">{disputedCases.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Pending Cases (Sorted by Neglect Score)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">All caught up!</h3>
                <p className="text-slate-500">No pending cases to handle.</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {cases.map((caseData) => (
                    <div
                      key={caseData.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <Link to={`/cases/${caseData.id}`}>
                          <h4 className="font-semibold text-slate-900 hover:text-primary truncate">
                            {caseData.title}
                          </h4>
                        </Link>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                          <span>{CATEGORIES[caseData.category]?.label}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              caseData.status === "open"
                                ? "bg-amber-100 text-amber-800"
                                : caseData.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {STATUS_LABELS[caseData.status]}
                          </span>
                        </div>
                      </div>

                      <div className="text-center px-4">
                        <p className="text-2xl font-black text-red-600">
                          {caseData.daysIgnored}
                        </p>
                        <p className="text-xs text-slate-500">Days</p>
                      </div>

                      <div className="flex gap-2">
                        {caseData.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(caseData.id, "in_progress")}
                            data-testid={`progress-btn-${caseData.id}`}
                          >
                            Mark In Progress
                          </Button>
                        )}
                        {(caseData.status === "open" || caseData.status === "in_progress" || caseData.status === "disputed") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCase(caseData);
                              setResolveDialogOpen(true);
                            }}
                            data-testid={`resolve-btn-${caseData.id}`}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Case as Resolved</DialogTitle>
            <DialogDescription>
              Provide resolution details. This will trigger citizen verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resolution Note *</Label>
              <Textarea
                value={resolveForm.note}
                onChange={(e) =>
                  setResolveForm((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="Describe what was done to resolve the issue..."
                rows={4}
                data-testid="resolve-note-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Resolution Photo (Recommended)</Label>
              <label>
                <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  ) : resolveForm.photoUrl ? (
                    <img
                      src={`${process.env.REACT_APP_BACKEND_URL}${resolveForm.photoUrl}`}
                      alt="Resolution"
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500">
                        Upload resolution photo
                      </span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="resolve-photo-input"
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolving || !resolveForm.note}
              data-testid="confirm-resolve-btn"
            >
              {resolving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
