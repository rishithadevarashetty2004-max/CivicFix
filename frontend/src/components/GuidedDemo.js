import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { MapPin, Clock, Shield, Printer, ChevronRight, ChevronLeft } from "lucide-react";

const demoSteps = [
  {
    title: "1. Explore the Map",
    description: "Browse active civic issues on the interactive map. Each pin represents a case with evidence.",
    icon: MapPin,
    action: "Go to Cases Map",
    path: "/cases",
    image: "🗺️",
  },
  {
    title: "2. View Neglect Timeline",
    description: "See the evidence trail: photos, timestamps, and how long the issue has been ignored.",
    icon: Clock,
    action: "Click any case to view",
    path: null,
    image: "📋",
  },
  {
    title: "3. Verification Gating",
    description: "'Resolved' requires citizen verification. Authority claims aren't final until confirmed.",
    icon: Shield,
    action: "Try verifying a case",
    path: null,
    image: "✅",
  },
  {
    title: "4. Generate Proof Pack",
    description: "Create a shareable, print-ready evidence summary for accountability.",
    icon: Printer,
    action: "View Proof Pack",
    path: "/proof/case-demo-3",
    image: "📄",
  },
];

export const GuidedDemoModal = ({ open, onOpenChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = demoSteps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    if (step.path) {
      window.location.href = step.path;
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{step.image}</span>
            Guided Demo
          </DialogTitle>
          <DialogDescription>
            Experience the key features of CivicFix in 2 minutes
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {demoSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentStep ? 'bg-primary' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
            <p className="text-slate-600 mb-6">{step.description}</p>
            
            {step.path && (
              <Button onClick={handleAction} className="mb-4">
                {step.action}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-sm text-slate-500">
            {currentStep + 1} / {demoSteps.length}
          </span>
          
          {currentStep < demoSteps.length - 1 ? (
            <Button variant="ghost" onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Finish
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const GuidedDemoButton = ({ className = "" }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={`border-primary text-primary hover:bg-primary hover:text-white ${className}`}
        data-testid="guided-demo-btn"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Guided Demo
      </Button>
      <GuidedDemoModal open={open} onOpenChange={setOpen} />
    </>
  );
};
