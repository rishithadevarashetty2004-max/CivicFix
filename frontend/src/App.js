import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Toaster } from "./components/ui/sonner";
import { PWAInstallPrompt } from "./components/PWAInstall";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import ReportPage from "./pages/ReportPage";
import FollowupPage from "./pages/FollowupPage";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import ProofPackPage from "./pages/ProofPackPage";
import AnalyticsPage from "@/pages/AnalyticsPage";


// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout with Navbar
const MainLayout = ({ children, showNavbar = true }) => {
  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <MainLayout showNavbar={false}>
            <LandingPage />
          </MainLayout>
        }
      />
      <Route
        path="/login"
        element={
          <MainLayout showNavbar={false}>
            <LoginPage />
          </MainLayout>
        }
      />
      <Route
        path="/register"
        element={
          <MainLayout showNavbar={false}>
            <RegisterPage />
          </MainLayout>
        }
      />

      {/* Cases - Public view */}
      <Route
        path="/cases"
        element={
          <MainLayout>
            <CasesPage />
          </MainLayout>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <MainLayout>
            <CaseDetailPage />
          </MainLayout>
        }
      />

      {/* Proof Pack - Public */}
      <Route
        path="/proof/:caseId"
        element={
          <MainLayout showNavbar={false}>
            <ProofPackPage />
          </MainLayout>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ReportPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id/followup"
        element={
          <ProtectedRoute>
            <MainLayout>
              <FollowupPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Authority Dashboard */}
      <Route
        path="/authority"
        element={
          <ProtectedRoute roles={["authority", "moderator"]}>
            <MainLayout>
              <AuthorityDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Moderator Dashboard */}
      <Route
        path="/moderator"
        element={
          <ProtectedRoute roles={["moderator"]}>
            <MainLayout>
              <ModeratorDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
        <Route
            path="/analytics"
            element={
                <ProtectedRoute roles={["authority", "moderator"]}>
                    <AnalyticsPage />
                </ProtectedRoute>
            }
        />


        {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
        <PWAInstallPrompt />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
