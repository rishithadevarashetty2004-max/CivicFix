import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapView } from "../components/MapView";
import { CaseCard } from "../components/CaseCard";
import { NeglectScorecard } from "../components/NeglectScorecard";
import { ErrorCard, EmptyState } from "../components/ErrorStates";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Skeleton } from "../components/ui/skeleton";
import { ScrollArea } from "../components/ui/scroll-area";
import { apiRequest, CATEGORIES, STATUS_LABELS } from "../lib/utils";
import { toast } from "sonner";
import {
  Filter,
  X,
  MapPin,
  List,
  Plus,
  RefreshCw,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("split"); // split, map, list
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    severity: 1,
    search: "",
    sort: "neglectScore",
  });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      if (filters.severity > 1) params.append("severity", filters.severity);
      params.append("sort", filters.sort);

      const data = await apiRequest(`/cases?${params.toString()}`);
      
      // Apply search filter client-side
      let filteredCases = data.cases || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredCases = filteredCases.filter(
          (c) =>
            c.title.toLowerCase().includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower)
        );
      }
      
      setCases(filteredCases);
    } catch (err) {
      setError(err.message || "Failed to load cases");
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      status: "",
      severity: 1,
      search: "",
      sort: "neglectScore",
    });
  };

  const applyFilters = () => {
    fetchCases();
    setShowFilters(false);
  };

  const mapCenter = cases.length > 0
    ? [cases[0].lat, cases[0].lng]
    : [28.6139, 77.2090];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col" data-testid="cases-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">Active Cases</h1>
            <span className="text-sm text-slate-500">({cases.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle - desktop */}
            <div className="hidden md:flex items-center border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode("split")}
                className={`p-2 rounded ${
                  viewMode === "split" ? "bg-slate-100" : ""
                }`}
                data-testid="view-split-btn"
              >
                <div className="flex gap-0.5">
                  <div className="w-2 h-4 border border-slate-400 rounded-sm" />
                  <div className="w-3 h-4 border border-slate-400 rounded-sm" />
                </div>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded ${
                  viewMode === "map" ? "bg-slate-100" : ""
                }`}
                data-testid="view-map-btn"
              >
                <MapPin className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${
                  viewMode === "list" ? "bg-slate-100" : ""
                }`}
                data-testid="view-list-btn"
              >
                <List className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
              data-testid="filter-toggle-btn"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {(filters.category || filters.status || filters.severity > 1) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchCases}
              disabled={loading}
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Link to="/report">
              <Button size="sm" data-testid="report-btn">
                <Plus className="w-4 h-4 mr-2" />
                Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search cases..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="pl-9"
                    data-testid="search-input"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(v) => handleFilterChange("category", v)}
                >
                  <SelectTrigger data-testid="category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {Object.entries(CATEGORIES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => handleFilterChange("status", v)}
                >
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label>Min Severity: {filters.severity}</Label>
                <Slider
                  value={[filters.severity]}
                  onValueChange={([v]) => handleFilterChange("severity", v)}
                  min={1}
                  max={5}
                  step={1}
                  className="mt-3"
                  data-testid="severity-filter"
                />
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filters.sort}
                  onValueChange={(v) => handleFilterChange("sort", v)}
                >
                  <SelectTrigger data-testid="sort-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neglectScore">Neglect Score</SelectItem>
                    <SelectItem value="date">Most Recent</SelectItem>
                    <SelectItem value="supporters">Most Supporters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button size="sm" onClick={applyFilters} data-testid="apply-filters-btn">
                Apply Filters
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4">
          <ErrorCard title="Failed to load cases" message={error} onRetry={fetchCases} />
        </div>
      )}

      {/* Main Content */}
      {!error && (
        <div className="flex-1 flex overflow-hidden">
          {/* Map View */}
          {(viewMode === "split" || viewMode === "map") && (
            <div
              className={`${
                viewMode === "split" ? "w-1/2 lg:w-2/3" : "w-full"
              } h-full`}
            >
              {loading ? (
                <div className="h-full flex items-center justify-center bg-slate-100">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <MapView
                  cases={cases}
                  center={mapCenter}
                  onCaseSelect={setSelectedCase}
                  selectedCaseId={selectedCase?.id}
                />
              )}
            </div>
          )}

          {/* List View */}
          {(viewMode === "split" || viewMode === "list") && (
            <div
              className={`${
                viewMode === "split" ? "w-1/2 lg:w-1/3" : "w-full"
              } h-full border-l border-slate-200 bg-white`}
            >
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : cases.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No cases found"
                    description="Try adjusting your filters or report a new issue"
                    action={
                      <Link to="/report">
                        <Button>Report Issue</Button>
                      </Link>
                    }
                  />
                ) : viewMode === "split" ? (
                  // Compact list for split view
                  <div>
                    {cases.map((caseData) => (
                      <CaseCard
                        key={caseData.id}
                        caseData={caseData}
                        compact={true}
                      />
                    ))}
                  </div>
                ) : (
                  // Full cards for list view
                  <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cases.map((caseData) => (
                      <CaseCard key={caseData.id} caseData={caseData} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
