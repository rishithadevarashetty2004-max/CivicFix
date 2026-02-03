import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const BACKEND_URL =
    "http://localhost:8001";

export const API_URL = `${BACKEND_URL}/api`;


export const CATEGORIES = {
  garbage_dump: { label: "Garbage Dump", icon: "Trash2" },
  sewage_leak: { label: "Sewage Leak", icon: "Droplets" },
  dead_animal: { label: "Dead Animal", icon: "Skull" },
  dustbin_overflow: { label: "Dustbin Overflow", icon: "Trash" },
  road_damage: { label: "Road Damage", icon: "Construction" },
  broken_streetlight: { label: "Broken Streetlight", icon: "Lightbulb" },
  illegal_construction: { label: "Illegal Construction", icon: "Building2" },
  water_contamination: { label: "Water Contamination", icon: "Droplet" },
  air_pollution: { label: "Air Pollution", icon: "Wind" },
  noise_pollution: { label: "Noise Pollution", icon: "Volume2" },
};

export const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  resolved_pending: "Resolved (Pending Verification)",
  verified_resolved: "Verified Resolved",
  disputed: "Disputed",
};

export const STATUS_COLORS = {
  open: "bg-amber-100 text-amber-800 border-amber-300",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300",
  resolved_pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  verified_resolved: "bg-green-100 text-green-800 border-green-300",
  disputed: "bg-red-100 text-red-800 border-red-300",
};

export const MARKER_COLORS = {
  open: "#f59e0b",
  in_progress: "#3b82f6",
  resolved_pending: "#eab308",
  verified_resolved: "#22c55e",
  disputed: "#ef4444",
};

export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getNeglectLevel(score) {
  if (score < 20) return { level: "low", color: "text-green-600" };
  if (score < 50) return { level: "medium", color: "text-amber-600" };
  if (score < 100) return { level: "high", color: "text-orange-600" };
  return { level: "critical", color: "text-red-600" };
}

export function getDaysIgnoredColor(days) {
  if (days < 7) return "text-green-600";
  if (days < 14) return "text-amber-600";
  if (days < 30) return "text-orange-600";
  return "text-red-600";
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("pon_token");
  
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }
  
  return response.json();
}
