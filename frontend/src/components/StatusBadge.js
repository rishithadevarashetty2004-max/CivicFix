import React from "react";
import { Badge } from "./ui/badge";
import { STATUS_LABELS, STATUS_COLORS } from "../lib/utils";

export const StatusBadge = ({ status, className = "" }) => {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono font-bold uppercase tracking-wider border ${STATUS_COLORS[status]} ${className}`}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
};

export const SeverityBadge = ({ severity }) => {
  const severityConfig = {
    1: { label: "Low", className: "bg-green-100 text-green-800 border-green-300" },
    2: { label: "Medium-Low", className: "bg-lime-100 text-lime-800 border-lime-300" },
    3: { label: "Medium", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    4: { label: "High", className: "bg-orange-100 text-orange-800 border-orange-300" },
    5: { label: "Critical", className: "bg-red-100 text-red-800 border-red-300" },
  };

  const config = severityConfig[severity] || severityConfig[3];

  return (
    <Badge variant="outline" className={`text-xs font-mono ${config.className}`}>
      Severity: {config.label}
    </Badge>
  );
};
