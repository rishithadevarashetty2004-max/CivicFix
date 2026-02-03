import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, CATEGORIES, STATUS_LABELS, getDaysIgnoredColor, getNeglectLevel } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Cell } from "recharts";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    Legend,
} from "recharts";

function toBarData(obj) {
    return Object.entries(obj || {}).map(([name, value]) => ({ name, value }));
}

function median(nums) {
    const arr = (nums || []).filter((n) => typeof n === "number" && !Number.isNaN(n)).slice().sort((a, b) => a - b);
    if (!arr.length) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function safeNum(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
}

function formatPct(x, digits = 1) {
    if (x === null || x === undefined) return "—";
    const n = Number(x);
    if (!Number.isFinite(n)) return "—";
    return `${(n * 100).toFixed(digits)}%`;
}

function downloadCSV(filename, rows) {
    const escape = (v) => {
        const s = String(v ?? "");
        if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
        return s;
    };
    const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Tailwind-ish class mapping consistent with your existing badges/colors
const STATUS_META = {
    open: { label: STATUS_LABELS?.open || "Open", className: "bg-amber-100 text-amber-800 border-amber-300", fill: "#f59e0b" },
    in_progress: { label: STATUS_LABELS?.in_progress || "In Progress", className: "bg-blue-100 text-blue-800 border-blue-300", fill: "#3b82f6" },
    resolved_pending: { label: STATUS_LABELS?.resolved_pending || "Resolved (Pending)", className: "bg-yellow-100 text-yellow-800 border-yellow-300", fill: "#eab308" },
    verified_resolved: { label: STATUS_LABELS?.verified_resolved || "Verified Resolved", className: "bg-green-100 text-green-800 border-green-300", fill: "#22c55e" },
    disputed: { label: STATUS_LABELS?.disputed || "Disputed", className: "bg-red-100 text-red-800 border-red-300", fill: "#ef4444" },
};

const TIME_PRESETS = [
    { key: "7", label: "Last 7 days", days: 7 },
    { key: "30", label: "Last 30 days", days: 30 },
    { key: "90", label: "Last 90 days", days: 90 },
    { key: "all", label: "All time", days: null },
];

function withinDays(dateString, days) {
    if (!days) return true;
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return true; // if missing/bad date, don't filter out
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= days;
}

function StatusPill({ status }) {
    const meta = STATUS_META[status] || { label: status, className: "bg-slate-100 text-slate-700 border-slate-200" };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-sm">
            <div className="font-medium text-slate-900 mb-1">{label}</div>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">{p.name}</span>
                    <span className="font-semibold text-slate-900">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");

    // filters
    const [timeKey, setTimeKey] = useState("30");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [search, setSearch] = useState("");

    const timeDays = useMemo(() => TIME_PRESETS.find((p) => p.key === timeKey)?.days ?? 30, [timeKey]);

    useEffect(() => {
        (async () => {
            try {
                setErr("");
                // If you later add server-side filtering, you can pass params here.
                const res = await apiRequest("/analytics/overview");
                setData(res);
            } catch (e) {
                setErr(e.message || "Failed to load analytics");
            }
        })();
    }, []);

    // cases may or may not exist in your payload
    const cases = useMemo(() => data?.cases || data?.items || null, [data]);

    const filteredCases = useMemo(() => {
        if (!cases) return null;
        const q = search.trim().toLowerCase();
        return (cases || [])
            .filter((c) => withinDays(c.createdAt || c.created_at || c.date, timeDays))
            .filter((c) => (statusFilter === "all" ? true : (c.status === statusFilter)))
            .filter((c) => (categoryFilter === "all" ? true : (c.category === categoryFilter)))
            .filter((c) => {
                if (!q) return true;
                const hay = `${c.title ?? ""} ${c.category ?? ""} ${c.status ?? ""} ${c.area ?? ""} ${c.ward ?? ""} ${c.locality ?? ""}`.toLowerCase();
                return hay.includes(q);
            });
    }, [cases, timeDays, statusFilter, categoryFilter, search]);

    // Compute analytics client-side when cases exist (for filters)
    const computed = useMemo(() => {
        // If no cases list, fall back to server-provided pre-aggregates (your current behavior)
        if (!filteredCases || !data) return null;

        const totals = {
            cases: filteredCases.length,
            supports: filteredCases.reduce((a, c) => a + safeNum(c.supportCount ?? c.supports ?? 0), 0),
            submissions: filteredCases.reduce((a, c) => a + safeNum(c.submissionCount ?? c.submissions ?? 0), 0),
            votes: filteredCases.reduce((a, c) => a + safeNum(c.voteCount ?? c.votes ?? 0), 0),
        };

        const byStatus = {};
        const byCategory = {};
        const zoneCounts = {};
        const daysIgnoredArr = [];
        const neglectArr = [];
        const disputedCount = filteredCases.filter((c) => c.status === "disputed").length;
        const verifiedResolvedCount = filteredCases.filter((c) => c.status === "verified_resolved").length;
        const resolvedLikeCount = filteredCases.filter((c) => c.status === "verified_resolved" || c.status === "resolved_pending").length;

        for (const c of filteredCases) {
            const st = c.status || "unknown";
            byStatus[st] = (byStatus[st] || 0) + 1;

            const cat = c.category || "unknown";
            byCategory[cat] = (byCategory[cat] || 0) + 1;

            const zone = c.area || c.ward || c.locality || c.zone || c.cityArea || null;
            if (zone) zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;

            if (typeof c.daysIgnored === "number") daysIgnoredArr.push(c.daysIgnored);
            if (typeof c.neglectScore === "number") neglectArr.push(c.neglectScore);
        }

        const avgDaysIgnored = daysIgnoredArr.length
            ? Math.round(
                daysIgnoredArr.reduce((a, b) => a + b, 0) / daysIgnoredArr.length
            )
            : null;

        const avgNeglectScore = neglectArr.length
            ? Number(
                (
                    neglectArr.reduce((a, b) => a + b, 0) / neglectArr.length
                ).toFixed(1)
            )
            : null;


        const backlog = (byStatus.open || 0) + (byStatus.in_progress || 0) + (byStatus.disputed || 0);

        const topNeglect = [...filteredCases]
            .map((c) => ({
                caseId: c.id || c.caseId || c._id,
                title: c.title,
                category: c.category,
                status: c.status,
                daysIgnored: c.daysIgnored,
                neglectScore: c.neglectScore,
            }))
            .sort((a, b) => safeNum(b.neglectScore) - safeNum(a.neglectScore))
            .slice(0, 10);

        const topZones = Object.entries(zoneCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // timeseries: if backend already provides, keep it; else try to compute from createdAt
        /*let newCasesDaily = data?.timeseries?.newCasesDaily || [];
        if (!newCasesDaily.length) {
            const m = new Map();
            for (const c of filteredCases) {
                const d = new Date(c.createdAt || c.created_at || c.date);
                if (Number.isNaN(d.getTime())) continue;
                const key = d.toISOString().slice(0, 10);
                m.set(key, (m.get(key) || 0) + 1);
            }
            newCasesDaily = [...m.entries()]
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-30);
        }*/
        const avgNeglectTrendDaily = data?.timeseries?.avgNeglectTrendDaily || [];
        const submissionsDaily = data?.timeseries?.submissionsDaily || [];



        return {
            totals,
            byStatus,
            byCategory,
            neglect: {
                avgDaysIgnored,
                avgNeglectScore,
                medianDaysIgnored: median(daysIgnoredArr),
                medianNeglectScore: median(neglectArr),
                topNeglect,
            },
            verification: {
                disputeRate: totals.cases ? disputedCount / totals.cases : 0,
                resolutionRate: totals.cases ? verifiedResolvedCount / totals.cases : 0,
                resolvedLikeRate: totals.cases ? resolvedLikeCount / totals.cases : 0,
            },
            backlog,
            topZones,
            timeseries: { avgNeglectTrendDaily, submissionsDaily },
        };
    }, [filteredCases, data]);

    // choose computed (filtered) if possible, else server aggregates (unfiltered)
    const view = computed || data;

    const statusData = useMemo(() => {
        const raw = toBarData(view?.byStatus);
        // nicer labels + stable ordering
        const order = ["open", "in_progress", "resolved_pending", "verified_resolved", "disputed"];
        raw.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        return raw.map((x) => ({
            ...x,
            label: STATUS_META[x.name]?.label || x.name,
            fill: STATUS_META[x.name]?.fill,
        }));
    }, [view]);

    const categoryData = useMemo(() => {
        const raw = toBarData(view?.byCategory);
        return raw.map((x) => ({
            ...x,
            label: CATEGORIES?.[x.name]?.label || x.name,
        }));
    }, [view]);

    //const newCasesDaily = view?.timeseries?.newCasesDaily || [];
    const topZones = view?.topZones || [];

    const insights = useMemo(() => {
        const t = view?.totals?.cases ?? 0;
        const backlog = view?.backlog ?? 0;
        const disputeRate = view?.verification?.disputeRate ?? null;

        const topCategory = [...categoryData].sort((a, b) => safeNum(b.value) - safeNum(a.value))[0];
        const topStatus = [...statusData].sort((a, b) => safeNum(b.value) - safeNum(a.value))[0];

        return [
            t ? `Backlog is ${backlog} cases (${Math.round((backlog / t) * 100)}% of total in view).` : "No cases in current view.",
            topCategory ? `Most common category: ${topCategory.label} (${topCategory.value}).` : "No category data.",
            topStatus ? `Most common status: ${topStatus.label} (${topStatus.value}).` : "No status data.",
            disputeRate !== null ? `Dispute rate: ${formatPct(disputeRate)}.` : "Dispute rate unavailable.",
        ];
    }, [view, categoryData, statusData]);

    const exportRows = useMemo(() => {
        if (!filteredCases) return null;
        const header = ["id", "title", "category", "status", "daysIgnored", "neglectScore", "createdAt", "area/ward/locality"];
        const rows = filteredCases.map((c) => [
            c.id || c.caseId || c._id || "",
            c.title || "",
            c.category || "",
            c.status || "",
            c.daysIgnored ?? "",
            c.neglectScore ?? "",
            c.createdAt || c.created_at || c.date || "",
            c.area || c.ward || c.locality || c.zone || "",
        ]);
        return [header, ...rows];
    }, [filteredCases]);

    const categoryOptions = useMemo(() => {
        // Use your known categories map if available; else infer from data
        const keysFromMap = CATEGORIES ? Object.keys(CATEGORIES) : [];
        const keysFromData = categoryData.map((x) => x.name);
        const keys = Array.from(new Set([...keysFromMap, ...keysFromData].filter(Boolean)));
        return keys;
    }, [categoryData]);

    if (err) return <div className="p-6 text-red-600">{err}</div>;

    // Loading skeleton
    if (!data) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-9 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}><CardContent className="pt-6"><Skeleton className="h-10 w-24" /></CardContent></Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card><CardContent className="pt-6"><Skeleton className="h-80 w-full" /></CardContent></Card>
                    <Card><CardContent className="pt-6"><Skeleton className="h-80 w-full" /></CardContent></Card>
                </div>
            </div>
        );
    }

    // Empty state (when filtered to none)
    const emptyFiltered = computed && (computed.totals?.cases ?? 0) === 0;

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header + actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <div className="text-2xl font-bold text-slate-900">Analytics</div>
                    <div className="text-sm text-slate-500">
                        Filtered insights for authorities/moderators. (Charts + drill-down)
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setData(null);
                            setErr("");
                            (async () => {
                                try {
                                    const res = await apiRequest("/analytics/overview");
                                    setData(res);
                                } catch (e) {
                                    setErr(e.message || "Failed to load analytics");
                                }
                            })();
                        }}
                    >
                        Refresh
                    </Button>

                    <Button
                        disabled={!exportRows}
                        onClick={() => exportRows && downloadCSV(`civicfix-analytics-${timeKey}.csv`, exportRows)}
                    >
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="card-shadow">
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* time */}
                    <div>
                        <div className="text-xs font-medium text-slate-600 mb-1">Time Range</div>
                        <select
                            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={timeKey}
                            onChange={(e) => setTimeKey(e.target.value)}
                        >
                            {TIME_PRESETS.map((p) => (
                                <option key={p.key} value={p.key}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* status */}
                    <div>
                        <div className="text-xs font-medium text-slate-600 mb-1">Status</div>
                        <select
                            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {Object.keys(STATUS_META).map((k) => (
                                <option key={k} value={k}>{STATUS_META[k].label}</option>
                            ))}
                        </select>
                    </div>

                    {/* category */}
                    <div>
                        <div className="text-xs font-medium text-slate-600 mb-1">Category</div>
                        <select
                            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {categoryOptions.map((k) => (
                                <option key={k} value={k}>{CATEGORIES?.[k]?.label || k}</option>
                            ))}
                        </select>
                    </div>

                    {/* search */}
                    <div>
                        <div className="text-xs font-medium text-slate-600 mb-1">Search</div>
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="title / area / status / category…"
                        />
                    </div>

                    {!cases && (
                        <div className="md:col-span-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                            Note: Backend response doesn’t include a <b>cases list</b>, so filters/table/export will be limited.
                            If you add <code className="px-1 py-0.5 bg-white border rounded">cases: [...]</code> in <b>/analytics/overview</b>,
                            you’ll get full drill-down + accurate filtered charts.
                        </div>
                    )}
                </CardContent>
            </Card>

            {emptyFiltered && (
                <Card className="border border-slate-200">
                    <CardContent className="py-10 text-center text-slate-600">
                        No data for current filters. Try a wider time range or remove filters.
                    </CardContent>
                </Card>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader><CardTitle>Total Cases</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{view?.totals?.cases ?? 0}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Backlog</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{view?.backlog ?? ((view?.byStatus?.open || 0) + (view?.byStatus?.in_progress || 0) + (view?.byStatus?.disputed || 0))}</CardContent>
                    <div className="px-6 pb-4 text-sm text-slate-500">Open + In Progress + Disputed</div>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Resolution Rate</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{formatPct(view?.verification?.resolutionRate)}</CardContent>
                    <div className="px-6 pb-4 text-sm text-slate-500">Verified resolved / total</div>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Dispute Rate</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{formatPct(view?.verification?.disputeRate)}</CardContent>
                    <div className="px-6 pb-4 text-sm text-slate-500">Disputed / total</div>
                </Card>
            </div>

            {/* Neglect metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader><CardTitle>Avg Days Ignored</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{view?.neglect?.avgDaysIgnored ?? "—"}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Median Days Ignored</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{view?.neglect?.medianDaysIgnored ?? "—"}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Avg Neglect Score</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{view?.neglect?.avgNeglectScore ?? "—"}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Median Neglect Score</CardTitle></CardHeader>
                    <CardContent className="text-3xl font-bold">{view?.neglect?.medianNeglectScore ?? "—"}</CardContent>
                </Card>
            </div>

            {/* Insights */}
            <Card className="card-shadow">
                <CardHeader><CardTitle>Insights</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.map((s, i) => (
                        <div key={i} className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3">
                            {s}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="card-shadow">
                    <CardHeader><CardTitle>Cases by Status</CardTitle></CardHeader>
                    <CardContent className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" />
                                <YAxis allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="value" name="Cases">
                                    {statusData.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={entry.fill || "#94a3b8"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="card-shadow">
                    <CardHeader><CardTitle>Cases by Category</CardTitle></CardHeader>
                    <CardContent className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={70} />
                                <YAxis allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="value" name="Cases" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Avg Neglect Score Trend (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent style={{ height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={view?.timeseries?.avgNeglectTrendDaily || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="avgNeglect" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Submissions Trend (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent style={{ height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={view?.timeseries?.submissionsDaily || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>


            </div>

            {/* Top zones */}
            <Card className="card-shadow">
                <CardHeader><CardTitle>Top Problem Zones</CardTitle></CardHeader>
                <CardContent>
                    {topZones?.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {topZones.map((z) => (
                                <div key={z.name} className="flex items-center justify-between border border-slate-200 rounded-md p-3 bg-white">
                                    <div className="font-medium text-slate-900 truncate">{z.name}</div>
                                    <div className="text-sm text-slate-600"><b>{z.value}</b> cases</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500">
                            Zone analytics will appear if case objects include <code>area</code>/<code>ward</code>/<code>locality</code>.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top neglected */}
            <Card className="card-shadow">
                <CardHeader><CardTitle>Top Most Neglected Cases</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {(view?.neglect?.topNeglect || []).slice(0, 10).map((c) => {
                        const n = getNeglectLevel?.(c.neglectScore ?? 0);
                        return (
                            <div key={c.caseId} className="flex items-center justify-between border-b py-2 gap-4">
                                <div className="min-w-0">
                                    <div className="font-medium text-slate-900 truncate">
                                        <Link className="hover:underline" to={`/cases/${c.caseId}`}>
                                            {c.title || c.caseId}
                                        </Link>
                                    </div>
                                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                        <span>{CATEGORIES?.[c.category]?.label || c.category}</span>
                                        <StatusPill status={c.status} />
                                        {n?.level && <span className={`text-xs font-semibold ${n.color}`}>{n.level.toUpperCase()}</span>}
                                    </div>
                                </div>
                                <div className="text-right text-sm shrink-0">
                                    <div><b>Score:</b> {c.neglectScore ?? "—"}</div>
                                    <div className={getDaysIgnoredColor?.(c.daysIgnored ?? 0) || ""}><b>Days:</b> {c.daysIgnored ?? "—"}</div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Drill-down table */}
            <Card className="card-shadow">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <CardTitle>Cases (Drill-down)</CardTitle>
                    <div className="text-sm text-slate-500">
                        {filteredCases ? `Showing ${filteredCases.length} case(s)` : "Backend didn’t provide cases list"}
                    </div>
                </CardHeader>
                <CardContent>
                    {!filteredCases ? (
                        <div className="text-sm text-slate-500">
                            Add <code>cases: [...]</code> to <b>/analytics/overview</b> response to enable this table + export + accurate filtered analytics.
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="text-sm text-slate-500">No cases for current filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="text-left border-b">
                                    <th className="py-2 pr-3">Title</th>
                                    <th className="py-2 pr-3">Category</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2 pr-3">Days</th>
                                    <th className="py-2 pr-3">Neglect</th>
                                    <th className="py-2 pr-3">Area</th>
                                    <th className="py-2 pr-3"></th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredCases.slice(0, 200).map((c) => {
                                    const id = c.id || c.caseId || c._id;
                                    return (
                                        <tr key={id} className="border-b hover:bg-slate-50">
                                            <td className="py-2 pr-3 max-w-[420px] truncate">
                                                <Link to={`/cases/${id}`} className="font-medium text-slate-900 hover:underline">
                                                    {c.title || id}
                                                </Link>
                                            </td>
                                            <td className="py-2 pr-3">{CATEGORIES?.[c.category]?.label || c.category || "—"}</td>
                                            <td className="py-2 pr-3"><StatusPill status={c.status} /></td>
                                            <td className={`py-2 pr-3 ${getDaysIgnoredColor?.(c.daysIgnored ?? 0) || ""}`}>{c.daysIgnored ?? "—"}</td>
                                            <td className="py-2 pr-3">{c.neglectScore ?? "—"}</td>
                                            <td className="py-2 pr-3">{c.area || c.ward || c.locality || "—"}</td>
                                            <td className="py-2 pr-3 text-right">
                                                <Button asChild size="sm" variant="outline">
                                                    <Link to={`/cases/${id}`}>View</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                            {filteredCases.length > 200 && (
                                <div className="pt-3 text-xs text-slate-500">
                                    Showing first 200 rows for performance. Export CSV to get all.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
