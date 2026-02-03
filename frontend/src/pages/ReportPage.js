import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { LocationPicker } from "../components/MapView";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Checkbox } from "../components/ui/checkbox";
import { apiRequest, CATEGORIES } from "../lib/utils";
import { toast } from "sonner";
import {
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
  MapPin,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  AlertTriangle,
  Info,
  CheckCircle,
  Merge,
} from "lucide-react";

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

const harmTypes = [
  { id: "health_hazard", label: "Health Hazard" },
  { id: "water_contamination", label: "Water Contamination" },
  { id: "odor", label: "Bad Odor" },
  { id: "pests", label: "Pests/Insects" },
  { id: "traffic_obstruction", label: "Traffic Obstruction" },
  { id: "visual_pollution", label: "Visual Pollution" },
];

const severityLabels = {
  1: "Minor",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Critical",
};

export default function ReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
    severity: 3,
    lat: null,
    lng: null,
    photoUrl: null,
    harmTypes: [],
  });

  // Result state
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!user) {
      toast.error("Please login to report an issue");
      navigate("/login");
    }
  }, [user, navigate]);

  const handleCategorySelect = (category) => {
    const categoryLabel = CATEGORIES[category]?.label || category;
    setFormData((prev) => ({
      ...prev,
      category,
      title: `${categoryLabel} Issue`,
    }));
    setStep(2);
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }));
          setDetectingLocation(false);
          toast.success("Location detected!");
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Could not detect location. Please select manually.");
          setDetectingLocation(false);
          // Default to Delhi
          setFormData((prev) => ({
            ...prev,
            lat: 28.6139,
            lng: 77.2090,
          }));
        }
      );
    } else {
      toast.error("Geolocation not supported");
      setDetectingLocation(false);
    }
  };

  const handleMapClick = (position) => {
    setFormData((prev) => ({
      ...prev,
      lat: position[0],
      lng: position[1],
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const data = await apiRequest("/upload", {
        method: "POST",
        body: form,
      });

      setFormData((prev) => ({ ...prev, photoUrl: data.url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleHarmTypeToggle = (harmId) => {
    setFormData((prev) => ({
      ...prev,
      harmTypes: prev.harmTypes.includes(harmId)
        ? prev.harmTypes.filter((h) => h !== harmId)
        : [...prev.harmTypes, harmId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.category) {
      toast.error("Please select a category");
      setStep(1);
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast.error("Please select a location");
      setStep(2);
      return;
    }

    if (!formData.description) {
      toast.error("Please add a description");
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest("/cases", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setResult(data);
      setStep(4);
      if (data.merged) {
        toast.success(`Merged into existing case (${data.mergeDistance}m away)!`);
      } else {
        toast.success("Case created successfully!");
      }
    } catch (error) {
      toast.error(error.message || "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: "Category", icon: AlertTriangle },
    { number: 2, label: "Location", icon: MapPin },
    { number: 3, label: "Details", icon: Camera },
    { number: 4, label: "Done", icon: Check },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="report-page">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    step >= s.number
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-slate-300 text-slate-400"
                  }`}
                >
                  {step > s.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <s.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`hidden sm:block w-20 md:w-32 h-1 mx-2 ${
                      step > s.number ? "bg-primary" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((s) => (
              <span
                key={s.number}
                className={`text-xs font-medium ${
                  step >= s.number ? "text-primary" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Category Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">What type of issue are you reporting?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(CATEGORIES).map(([key, { label }]) => {
                      const Icon = categoryIcons[key];
                      return (
                        <button
                          key={key}
                          onClick={() => handleCategorySelect(key)}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-primary hover:bg-primary/5 ${
                            formData.category === key
                              ? "border-primary bg-primary/10"
                              : "border-slate-200"
                          }`}
                          data-testid={`category-${key}`}
                        >
                          <Icon className="w-5 h-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">Where is the issue located?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={detectLocation}
                    disabled={detectingLocation}
                    variant="outline"
                    className="w-full"
                    data-testid="detect-location-btn"
                  >
                    {detectingLocation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-2" />
                    )}
                    {detectingLocation ? "Detecting..." : "Auto-detect My Location"}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">or click on map</span>
                    </div>
                  </div>

                  <LocationPicker
                    position={formData.lat ? [formData.lat, formData.lng] : null}
                    onPositionChange={handleMapClick}
                  />

                  {formData.lat && formData.lng && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        Location selected: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(1)} data-testid="prev-btn-2">
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!formData.lat || !formData.lng}
                      data-testid="next-btn-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">Provide more details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Brief title for the issue"
                      data-testid="title-input"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Describe the issue in detail..."
                      rows={4}
                      data-testid="description-input"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label>Photo Evidence (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1">
                        <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                          {uploadingImage ? (
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                          ) : formData.photoUrl ? (
                            <img
                              src={`${process.env.REACT_APP_BACKEND_URL}${formData.photoUrl}`}
                              alt="Uploaded"
                              className="h-full w-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center">
                              <Camera className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <span className="text-sm text-slate-500">Tap to take photo</span>
                              <span className="text-xs text-slate-400 block mt-1">or select from gallery</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                          data-testid="photo-upload-input"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Severity */}
                  <div className="space-y-2">
                    <Label>
                      Severity: <span className="font-bold">{severityLabels[formData.severity]}</span>
                    </Label>
                    <Slider
                      value={[formData.severity]}
                      onValueChange={([v]) =>
                        setFormData((prev) => ({ ...prev, severity: v }))
                      }
                      min={1}
                      max={5}
                      step={1}
                      className="mt-2"
                      data-testid="severity-slider"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Minor</span>
                      <span>Critical</span>
                    </div>
                  </div>

                  {/* Harm Types */}
                  <div className="space-y-3">
                    <Label>Associated Hazards (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {harmTypes.map((harm) => (
                        <div
                          key={harm.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={harm.id}
                            checked={formData.harmTypes.includes(harm.id)}
                            onCheckedChange={() => handleHarmTypeToggle(harm.id)}
                            data-testid={`harm-${harm.id}`}
                          />
                          <Label
                            htmlFor={harm.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {harm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Info about duplicate merge */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-800">
                      If a similar case exists within 200 meters, your report will be merged to strengthen that case instead of creating a duplicate.
                    </span>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(2)} data-testid="prev-btn-3">
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !formData.description}
                      data-testid="submit-report-btn"
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Submit Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && result && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className={`card-shadow ${result.merged ? 'border-purple-300' : ''}`}>
                <CardContent className="pt-8 pb-8 text-center">
                  {result.merged ? (
                    <>
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Merge className="w-8 h-8 text-purple-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Report Merged!
                      </h2>
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-6 max-w-md mx-auto">
                        <p className="text-purple-800 font-medium mb-1">
                          Merged into existing case ({result.mergeDistance}m away)
                        </p>
                        <p className="text-sm text-purple-600">
                          Your evidence has been added to strengthen the existing case. This prevents duplicates and builds a stronger accountability record.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Case Created!
                      </h2>
                      <p className="text-slate-600 mb-6">
                        Your case has been created and is now visible on the map.
                      </p>
                    </>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => navigate(`/cases/${result.case.id}`)}
                      data-testid="view-case-btn"
                    >
                      View Case
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/cases")}
                    >
                      Explore Map
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
