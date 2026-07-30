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
    <div className="min-h-screen bg-[#22223B] text-[#F2E9E4] flex items-center justify-center p-4 selection:bg-[#4A4E69] selection:text-white">
      <div className="w-full max-w-md bg-[#4A4E69]/30 border border-[#4A4E69]/60 rounded-3xl p-8 shadow-2xl space-y-6 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#4A4E69] border border-[#9A8C98]/40 text-white flex items-center justify-center mx-auto shadow-md">
            <HardDrive className="w-6 h-6 text-[#F2E9E4]" />
          </div>
          <h1 className="text-xl font-extrabold text-[#F2E9E4] tracking-tight">Welcome Back to Conflux</h1>
          <p className="text-xs text-[#C9ADA7]">Sign in to access your multi-cloud workspace.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#C9ADA7] uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9A8C98] absolute left-3 top-3" />
              <Input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-[#22223B] border-[#4A4E69] text-[#F2E9E4] placeholder:text-[#9A8C98] text-xs h-10 focus:border-[#9A8C98]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-[#C9ADA7] uppercase tracking-wider">Password</label>
              <Link to="/forgot-password" className="text-[11px] font-semibold text-[#C9ADA7] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9A8C98] absolute left-3 top-3" />
              <Input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-[#22223B] border-[#4A4E69] text-[#F2E9E4] placeholder:text-[#9A8C98] text-xs h-10 focus:border-[#9A8C98]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#9A8C98] hover:text-[#F2E9E4]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A4E69] hover:bg-[#9A8C98] text-white font-bold text-xs h-10 rounded-xl shadow-lg transition-all border border-[#9A8C98]/30"
          >
            {loading ? "Authenticating..." : "Sign In to Workspace"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="text-center text-xs text-[#C9ADA7] pt-2">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-[#F2E9E4] hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
