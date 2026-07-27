"use client";

import React from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const checks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "At least one uppercase letter (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter (a-z)", valid: /[a-z]/.test(password) },
    { label: "At least one number (0-9)", valid: /[0-9]/.test(password) },
    { label: "At least one special character (!@#$%^&* etc.)", valid: /[!@#$%^&*()_+\-=\[\]{};:\'",.<>/?\\|`~]/.test(password) },
  ];

  const score = checks.filter((c) => c.valid).length;

  const getStrengthText = () => {
    if (!password) return "";
    if (score <= 2) return "Weak";
    if (score <= 4) return "Medium";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (score <= 2) return "bg-red-500";
    if (score <= 4) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-3 mt-2">
      {password.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Password strength:</span>
            <span className={`font-semibold ${score <= 2 ? "text-red-400" : score <= 4 ? "text-amber-400" : "text-emerald-400"}`}>
              {getStrengthText()}
            </span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-1 p-0.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-full flex-1 rounded-full transition-all duration-300 ${
                  level <= score ? getStrengthColor() : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-1.5 text-xs text-zinc-400 pt-1">
        {checks.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            )}
            <span className={item.valid ? "text-zinc-300" : "text-zinc-500"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
