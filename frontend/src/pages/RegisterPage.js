import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { toast } from "sonner";
import { FileText, Loader2, User, Shield, ShieldCheck } from "lucide-react";

const roles = [
  {
    value: "citizen",
    label: "Citizen",
    description: "Report issues, support cases, verify resolutions",
    icon: User,
  },
  {
    value: "authority",
    label: "Authority",
    description: "Handle assigned cases, mark resolutions",
    icon: Shield,
  },
  {
    value: "moderator",
    label: "Moderator",
    description: "Oversee platform, resolve disputes",
    icon: ShieldCheck,
  },
];

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("citizen");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, role);
      toast.success("Account created successfully!");
      navigate("/cases");
    } catch (error) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <Card className="w-full max-w-md card-shadow">
        <CardHeader className="space-y-1 text-center">
          <Link to="/" className="inline-flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Join the civic movement for real accountability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="register-name-input"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email-input"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="register-password-input"
                required
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label>Select your role</Label>
              <RadioGroup value={role} onValueChange={setRole} className="space-y-2">
                {roles.map((r) => (
                  <div
                    key={r.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      role === r.value
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setRole(r.value)}
                  >
                    <RadioGroupItem value={r.value} id={r.value} data-testid={`role-${r.value}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <r.icon className="w-4 h-4 text-slate-600" />
                        <Label htmlFor={r.value} className="font-medium cursor-pointer">
                          {r.label}
                        </Label>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">Already have an account? </span>
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
