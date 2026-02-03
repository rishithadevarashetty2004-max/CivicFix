import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GuidedDemoButton } from "./GuidedDemo";
import { InstallAppButton } from "./PWAInstall";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import { apiRequest } from "../lib/utils";
import {
  MapPin,
  FileText,
  Plus,
  Menu,
  X,
  User,
  LogOut,
  Shield,
  ShieldCheck,
  Home,
  RefreshCw,
  Loader2,
} from "lucide-react";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Reset all data and reseed demo data?")) return;
    
    setResetting(true);
    try {
      await apiRequest("/seed/reset", { method: "POST" });
      toast.success("Demo data reset successfully!");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to reset demo data");
    } finally {
      setResetting(false);
    }
  };

  const navLinks = [
    { path: "/cases", label: "Explore Map", icon: MapPin },
    { path: "/report", label: "Report Issue", icon: Plus, authRequired: true },
  ];

  const roleLinks = {
    authority: { path: "/authority", label: "Authority Dashboard", icon: Shield },
    moderator: { path: "/moderator", label: "Moderator Dashboard", icon: ShieldCheck },
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 hidden sm:block">
              CivicFix
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.authRequired && !user) return null;
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={`nav-${link.path.replace("/", "")}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:text-primary hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* Role-specific links */}
            {user && roleLinks[user.role] && (
              <Link
                to={roleLinks[user.role].path}
                data-testid={`nav-${user.role}-dashboard`}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === roleLinks[user.role].path
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:text-primary hover:bg-slate-50"
                }`}
              >
                {React.createElement(roleLinks[user.role].icon, { className: "w-4 h-4" })}
                {roleLinks[user.role].label}
              </Link>
            )}
          </div>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* PWA Install Button */}
            <InstallAppButton />
            
            {/* Guided Demo Button */}
            <GuidedDemoButton />
            
            {/* Demo Mode Toggle - Moderator Only */}
            {user && user.role === "moderator" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDemo}
                disabled={resetting}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                data-testid="reset-demo-btn"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Reset Demo
              </Button>
            )}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid="user-menu-trigger"
                  >
                    <User className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" data-testid="nav-login-btn">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button data-testid="nav-register-btn">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-600 hover:bg-slate-50"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              
              {navLinks.map((link) => {
                if (link.authRequired && !user) return null;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-slate-600 hover:bg-slate-50`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}

              {user && roleLinks[user.role] && (
                <Link
                  to={roleLinks[user.role].path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-600 hover:bg-slate-50"
                >
                  {React.createElement(roleLinks[user.role].icon, { className: "w-4 h-4" })}
                  {roleLinks[user.role].label}
                </Link>
              )}

              <div className="border-t border-slate-200 mt-2 pt-2">
                {user ? (
                  <>
                    {user.role === "moderator" && (
                      <button
                        onClick={() => {
                          handleResetDemo();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-amber-700 hover:bg-amber-50 w-full"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset Demo Data
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-600 hover:bg-slate-50"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white mt-2 mx-4"
                    >
                      Get Started
                    </Link>


                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
