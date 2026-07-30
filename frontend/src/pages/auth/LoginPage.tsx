import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { HardDrive, Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const { login } = useAuth();
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
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center p-4 selection:bg-[#F26A21] selection:text-white">
      <div className="w-full max-w-md bg-[#2B2B2B]/60 border border-[#2B2B2B] rounded-3xl p-8 shadow-2xl space-y-6 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#F26A21] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#F26A21]/20">
            <HardDrive className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Welcome Back to Conflux</h1>
          <p className="text-xs text-[#6B7280]">Enter your credentials to access your unified cloud drive.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
              <Input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-[#111111] border-[#2B2B2B] text-white text-xs h-10 focus:border-[#F26A21]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Password</label>
              <Link to="/forgot-password" className="text-[11px] font-semibold text-[#F26A21] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
              <Input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-[#111111] border-[#2B2B2B] text-white text-xs h-10 focus:border-[#F26A21]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#6B7280] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F26A21] hover:bg-[#C94F0C] text-white font-bold text-xs h-10 rounded-xl shadow-lg transition-all"
          >
            {loading ? "Authenticating..." : "Sign In to Workspace"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="text-center text-xs text-[#6B7280] pt-2">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-[#F26A21] hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
