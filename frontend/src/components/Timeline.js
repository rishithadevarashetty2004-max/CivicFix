import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Camera,
  CheckCircle,
  Clock,
  User,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { formatDateTime } from "../lib/utils";

const typeConfig = {
  REPORT: {
    icon: FileText,
    color: "bg-blue-500",
    label: "Initial Report",
  },
  FOLLOWUP: {
    icon: Camera,
    color: "bg-amber-500",
    label: "Follow-up Evidence",
  },
  AUTH_RESOLUTION: {
    icon: CheckCircle,
    color: "bg-green-500",
    label: "Authority Resolution",
  },
};

const roleIcons = {
  citizen: User,
  authority: Shield,
  moderator: ShieldCheck,
};

export const Timeline = ({ submissions = [], className = "" }) => {
  if (!submissions.length) {
    return (
      <div className="text-center py-8 text-slate-500">
        No timeline entries yet
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-0">
        {submissions.map((submission, index) => {
          const config = typeConfig[submission.type] || typeConfig.REPORT;
          const Icon = config.icon;
          const RoleIcon = roleIcons[submission.userRole] || User;

          return (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3, ease: "easeOut" }}
              className="relative pl-12 pb-8 last:pb-0"
              data-testid={`timeline-item-${submission.id}`}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-2 top-1 w-5 h-5 rounded-full ${config.color} border-4 border-white shadow-sm timeline-dot`}
              />

              {/* Content card */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-900">
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <RoleIcon className="w-3 h-3" />
                      <span>{submission.userName}</span>
                      <span className="capitalize text-slate-400">
                        ({submission.userRole || "citizen"})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(submission.createdAt)}
                  </div>
                </div>

                {/* Note */}
                {submission.note && (
                  <p className="text-sm text-slate-700 mb-3">{submission.note}</p>
                )}

                {/* Photo */}
                {submission.photoUrl && (
                  <div className="mt-3">
                    <img
                      src={`${process.env.REACT_APP_BACKEND_URL}${submission.photoUrl}`}
                      alt="Evidence"
                      className="rounded-lg max-h-48 object-cover border border-slate-200"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Location if different */}
                {submission.lat && submission.lng && (
                  <div className="mt-2 text-xs text-slate-400">
                    Location: {submission.lat.toFixed(4)}, {submission.lng.toFixed(4)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Compact timeline for proof pack
export const CompactTimeline = ({ submissions = [] }) => {
  return (
    <div className="space-y-3">
      {submissions.map((submission, index) => {
        const config = typeConfig[submission.type] || typeConfig.REPORT;

        return (
          <div
            key={submission.id}
            className="proof-timeline-item"
          >
            <div className={`proof-timeline-dot ${config.color}`} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {config.label}
                </p>
                <p className="text-xs text-slate-500">
                  {submission.userName} • {formatDateTime(submission.createdAt)}
                </p>
                {submission.note && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {submission.note}
                  </p>
                )}
              </div>
              {submission.photoUrl && (
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL}${submission.photoUrl}`}
                  alt="Evidence"
                  className="w-16 h-16 object-cover rounded border"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
