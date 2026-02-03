import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Merge,
  Loader2,
  RefreshCw,
  Eye,
  BarChart3,
} from "lucide-react";

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({
    disputed: [],
    pendingVerification: [],
    all: [],
  });
  const [loading, setLoading] = useState(true);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeTo, setMergeTo] = useState("");

  useEffect(() => {
    if (!user || user.role !== "moderator") {
      toast.error("Access denied. Moderator role required.");
      navigate("/");
      return;
    }
    fetchCases();
  }, [user, navigate]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/moderator/cases");
      setData(response);
    } catch (error) {
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (caseId, vote) => {
    try {
      await apiRequest(`/cases/${caseId}/verify`, {
        method: "POST",
        body: JSON.stringify({ vote }),
      });

      toast.success(`Moderator verification submitted: ${vote}`);
      fetchCases();
    } catch (error) {
      toast.error(error.message || "Failed to verify");
    }
  };

  const handleMerge = async () => {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) {
      toast.error("Please select two different cases to merge");
      return;
    }

    setMerging(true);
    try {
      const formData = new FormData();
      formData.append("from_case_id", mergeFrom);
      formData.append("to_case_id", mergeTo);

      await apiRequest("/moderator/merge", {
        method: "POST",
        body: formData,
      });

      toast.success("Cases merged successfully");
      setMergeDialogOpen(false);
      setMergeFrom("");
      setMergeTo("");
      fetchCases();
    } catch (error) {
      toast.error(error.message || "Failed to merge cases");
    } finally {
      setMerging(false);
    }
  };

  const CaseRow = ({ caseData, showActions = false }) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex-1 min-w-0">
        <Link to={`/cases/${caseData.id}`}>
          <h4 className="font-semibold text-slate-900 hover:text-primary truncate">
            {caseData.title}
          </h4>
        </Link>
        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
          <span>{CATEGORIES[caseData.category]?.label}</span>
          <StatusBadge status={caseData.status} />
        </div>
      </div>

      <div className="text-center px-4">
        <p className="text-2xl font-black text-red-600">{caseData.daysIgnored}</p>
        <p className="text-xs text-slate-500">Days</p>
      </div>

      <div className="flex items-center gap-2">
        <Link to={`/cases/${caseData.id}`}>
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </Link>

        {showActions && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50"
              onClick={() => handleVerify(caseData.id, "FIXED")}
              data-testid={`mod-verify-fixed-${caseData.id}`}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => handleVerify(caseData.id, "NOT_FIXED")}
              data-testid={`mod-verify-notfixed-${caseData.id}`}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" data-testid="moderator-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Moderator Dashboard
                </h1>
                <p className="text-sm text-slate-500">
                  Oversee platform, resolve disputes, manage duplicates
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                  variant="outline"
                  onClick={() => setMergeDialogOpen(true)}
                  data-testid="merge-cases-btn"
              >
                <Merge className="w-4 h-4 mr-2" />
                Merge Cases
              </Button>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Disputed Cases</p>
                  <p className="text-3xl font-bold text-red-600">
                    {data.disputed?.length || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Verification</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {data.pendingVerification?.length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Cases</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {data.all?.length || 0}
                  </p>
                </div>
                <ShieldCheck className="w-8 h-8 text-slate-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="disputed" className="space-y-4">
          <TabsList>
            <TabsTrigger value="disputed" data-testid="tab-disputed">
              Disputed ({data.disputed?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending Verification ({data.pendingVerification?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              All Cases ({data.all?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disputed">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Disputed Cases - Need Moderator Decision
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (data.disputed?.length || 0) === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                    <p>No disputed cases</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {data.disputed.map((c) => (
                        <CaseRow key={c.id} caseData={c} showActions={true} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Clock className="w-5 h-5" />
                  Pending Verification - Override if Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (data.pendingVerification?.length || 0) === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                    <p>No cases pending verification</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {data.pendingVerification.map((c) => (
                        <CaseRow key={c.id} caseData={c} showActions={true} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  All Cases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {(data.all || []).map((c) => (
                        <CaseRow key={c.id} caseData={c} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5" />
              Merge Cases
            </DialogTitle>
            <DialogDescription>
              Merge one case into another. The source case will be deleted and its
              submissions/supporters will be moved to the target case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Case (will be deleted)</label>
              <Select value={mergeFrom} onValueChange={setMergeFrom}>
                <SelectTrigger data-testid="merge-from-select">
                  <SelectValue placeholder="Select source case" />
                </SelectTrigger>
                <SelectContent>
                  {(data.all || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title.slice(0, 40)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Case (will receive data)</label>
              <Select value={mergeTo} onValueChange={setMergeTo}>
                <SelectTrigger data-testid="merge-to-select">
                  <SelectValue placeholder="Select target case" />
                </SelectTrigger>
                <SelectContent>
                  {(data.all || [])
                    .filter((c) => c.id !== mergeFrom)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title.slice(0, 40)}...
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={merging || !mergeFrom || !mergeTo}
              data-testid="confirm-merge-btn"
            >
              {merging && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Merge Cases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
