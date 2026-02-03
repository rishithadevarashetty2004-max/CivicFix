import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LocationPicker } from "../components/MapView";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { apiRequest } from "../lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Loader2,
  MapPin,
  Camera,
  CheckCircle,
} from "lucide-react";

export default function FollowupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [formData, setFormData] = useState({
    note: "",
    photoUrl: null,
    lat: null,
    lng: null,
  });

  useEffect(() => {
    if (!user) {
      toast.error("Please login to add follow-up evidence");
      navigate("/login");
    }
  }, [user, navigate]);

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
        () => {
          toast.error("Could not detect location");
          setDetectingLocation(false);
        }
      );
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
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

  const handleSubmit = async () => {
    if (!formData.note) {
      toast.error("Please add a note describing the current status");
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`/cases/${id}/followup`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      toast.success("Follow-up evidence added!");
      navigate(`/cases/${id}`);
    } catch (error) {
      toast.error(error.message || "Failed to add follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="followup-page">
      <div className="max-w-2xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(`/cases/${id}`)}
          className="mb-4"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Case
        </Button>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Add Follow-up Evidence
            </CardTitle>
            <CardDescription>
              Document the current status of this issue. Your evidence helps build a stronger case.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Current Status / Notes *</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="Describe the current condition. Has it improved? Worsened? No change?"
                rows={4}
                data-testid="note-input"
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photo Evidence</Label>
              <label>
                <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
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
                      <span className="text-sm text-slate-500">
                        Tap to take photo
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">
                        or select from gallery
                      </span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="photo-input"
                />
              </label>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Your Current Location (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="w-full mb-2"
                data-testid="detect-location-btn"
              >
                {detectingLocation ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                {detectingLocation ? "Detecting..." : "Use My Location"}
              </Button>

              {formData.lat && formData.lng && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Location: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.note}
              className="w-full"
              data-testid="submit-followup-btn"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Follow-up
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
