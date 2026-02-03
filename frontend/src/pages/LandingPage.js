import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GuidedDemoModal } from "../components/GuidedDemo";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  MapPin,
  FileText,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Shield,
  Merge,
  ChevronRight,
  ArrowRight,
  Play,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Neglect Timeline",
    description: "Build a time-stamped evidence trail that proves how long issues have been ignored.",
    color: "bg-red-100 text-red-600",
  },
  {
    icon: CheckCircle,
    title: "Crowd Verification",
    description: "'Resolved' means nothing until nearby citizens verify the fix is real.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: FileText,
    title: "Proof Pack",
    description: "Generate shareable evidence summaries with photos, timeline, and verification status.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Merge,
    title: "Duplicate Merge",
    description: "Multiple reports for the same location automatically merge into one powerful case.",
    color: "bg-purple-100 text-purple-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Report",
    description: "Snap a photo, mark location, describe the issue. Takes under 60 seconds.",
    icon: MapPin,
  },
  {
    number: "02",
    title: "Evidence Trail",
    description: "Add follow-ups over time. Each submission strengthens your case.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Verified Resolution",
    description: "When authorities claim 'fixed', citizens verify. No more fake closures.",
    icon: Shield,
  },
];

const stats = [
  { value: "87%", label: "Issues Resolved" },
  { value: "12K+", label: "Active Citizens" },
  { value: "34", label: "Avg. Days to Fix" },
];

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen" data-testid="landing-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary py-20 lg:py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="grid-pattern w-full h-full" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-none mb-6">
                REPORT.<br />
                PROVE.<br />
                <span className="text-amber-400">VERIFY.</span>
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-lg">
                A civic platform that prevents fake "Resolved" closures by building evidence trails and community verification.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/report">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] btn-press"
                    data-testid="hero-report-btn"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Report an Issue
                  </Button>
                </Link>
                <Link to="/cases">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-white text-white hover:bg-white/10"
                    data-testid="hero-explore-btn"
                  >
                    <MapPin className="w-5 h-5 mr-2" />
                    Explore Map
                  </Button>
                </Link>
              </div>
              
              {/* Guided Demo Button */}
              <div className="mt-6">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => setShowDemo(true)}
                  data-testid="hero-demo-btn"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch 2-minute Demo
                </Button>
              </div>
            </motion.div>

            {/* Hero Image/Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
                <div className="grid grid-cols-3 gap-6 mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <p className="text-4xl font-black text-white">{stat.value}</p>
                      <p className="text-sm text-white/60">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">Sample Case</span>
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">OPEN</span>
                  </div>
                  <p className="text-slate-600 text-sm mb-3">Garbage dump near park entrance</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="w-3 h-3" />
                      <span>18 supporters</span>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-red-600">15</p>
                      <p className="text-[10px] text-slate-500 uppercase">Days Ignored</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple steps to turn your complaint into verified action
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <Card className="h-full card-shadow-hover border-2 border-slate-100 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-5xl font-black text-slate-100">
                        {step.number}
                      </span>
                      <div className="p-3 rounded-lg bg-primary/10">
                        <step.icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-600">{step.description}</p>
                  </CardContent>
                </Card>
                
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes PoN Unique */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              What Makes PoN Unique
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Not another complaint portal. A system designed to create accountability.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full card-shadow-hover">
                  <CardContent className="p-6">
                    <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Explanation */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 md:p-12 border border-primary/10">
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-primary/10 rounded-full mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                "Resolved" ≠ Verified Resolved
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                When authorities mark a case as resolved, it enters "Pending Verification" status.
                Only after community verification does it become truly resolved.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-3xl font-black text-primary mb-1">3+</p>
                <p className="text-sm text-slate-600">Citizen verifications required</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-3xl font-black text-amber-600 mb-1">OR</p>
                <p className="text-sm text-slate-600">Moderator override</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-3xl font-black text-red-600 mb-1">50%+</p>
                <p className="text-sm text-slate-600">Majority vote determines outcome</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Stop "Resolved" Without Fix
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Join thousands of citizens building evidence trails and demanding real accountability.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] btn-press"
                data-testid="cta-register-btn"
              >
                Get Started
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/cases">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10"
              >
                View Active Cases
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">CivicFix</span>
            </div>
            <p className="text-sm text-center md:text-left">
              Hackathon MVP - Civic environmental issue tracking platform.
            </p>
            <div className="flex gap-4 text-sm">
              <Link to="/cases" className="hover:text-white transition-colors">
                Cases
              </Link>
              <Link to="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Guided Demo Modal */}
      <GuidedDemoModal open={showDemo} onOpenChange={setShowDemo} />
    </div>
  );
}
