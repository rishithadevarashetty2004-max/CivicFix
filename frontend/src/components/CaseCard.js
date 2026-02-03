import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  MapPin,
  Clock,
  Users,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Droplets,
  Skull,
  Trash,
  Construction,
  Lightbulb,
  Building2,
  Droplet,
  Wind,
  Volume2,
} from "lucide-react";
import { CATEGORIES, STATUS_LABELS, STATUS_COLORS, getDaysIgnoredColor, formatDate } from "../lib/utils";

const categoryIcons = {
  garbage_dump: Trash2,
  sewage_leak: Droplets,
  dead_animal: Skull,
  dustbin_overflow: Trash,
  road_damage: Construction,
  broken_streetlight: Lightbulb,
  illegal_construction: Building2,
  water_contamination: Droplet,
  air_pollution: Wind,
  noise_pollution: Volume2,
};

export const CaseCard = ({ caseData, compact = false }) => {
  const CategoryIcon = categoryIcons[caseData.category] || AlertTriangle;
  const daysColor = getDaysIgnoredColor(caseData.daysIgnored);

  if (compact) {
    return (
      <Link to={`/cases/${caseData.id}`} data-testid={`case-card-${caseData.id}`}>
        <div className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors feed-item">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-900 truncate">
                  {caseData.title}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {caseData.supportersCount}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[caseData.status]}`}
                >
                  {STATUS_LABELS[caseData.status]}
                </Badge>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-lg font-black ${daysColor}`} data-testid={`days-ignored-${caseData.id}`}>
                {caseData.daysIgnored}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Days</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/cases/${caseData.id}`} data-testid={`case-card-${caseData.id}`}>
      <Card className="case-card card-shadow-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-100`}>
                  <CategoryIcon className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 line-clamp-1">
                    {caseData.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {CATEGORIES[caseData.category]?.label || caseData.category}
                  </p>
                </div>
              </div>
              
              {/* Days Ignored - Prominent */}
              <div className="text-right">
                <p className={`text-3xl font-black tracking-tighter ${daysColor}`} data-testid={`days-ignored-${caseData.id}`}>
                  {caseData.daysIgnored}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Days Ignored
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
              {caseData.description}
            </p>

            {/* Stats & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {caseData.supportersCount} supporters
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {caseData.submissionsCount} updates
                </span>
              </div>
              
              <Badge
                variant="outline"
                className={`text-xs font-mono font-bold uppercase tracking-wider ${STATUS_COLORS[caseData.status]}`}
              >
                {STATUS_LABELS[caseData.status]}
              </Badge>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>{caseData.lat.toFixed(4)}, {caseData.lng.toFixed(4)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Reported {formatDate(caseData.firstReportedAt)}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
