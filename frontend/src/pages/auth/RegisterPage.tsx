import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { HardDrive, Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex items-center justify-center p-4 selection:bg-primary selection:text-white">
      <div className="w-full max-w-md bg-bg-surface border border-border rounded-[var(--radius-2xl)] p-8 shadow-[var(--shadow-xl)] space-y-6 cfx-scale-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-primary text-white flex items-center justify-center mx-auto shadow-[var(--shadow-md)]">
            <HardDrive className="w-6 h-6" />
          </div>
          <h1 className="text-[var(--font-size-h3)] font-extrabold text-text-primary tracking-tight">Create Conflux Workspace</h1>
          <p className="text-[var(--font-size-caption)] text-text-muted">Start pooling your multi-cloud storage accounts in seconds.</p>
        </div>

        {error && (
          <div className="p-3 bg-danger-light border border-danger/20 text-danger text-[var(--font-size-caption)] rounded-[var(--radius-lg)] font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <Input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <Input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-text-muted hover:text-text-primary transition-colors duration-[var(--duration-fast)]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full h-10"
          >
            Create Account <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="text-center text-[var(--font-size-caption)] text-text-muted pt-2 border-t border-border-subtle">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
