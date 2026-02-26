"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  showStrength?: boolean;
}

function getStrength(value: string) {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  if (value.length >= 10 && hasUpper && hasLower && hasNumber && hasSpecial) {
    return { label: "Strong", color: "bg-green-500", width: "100%" };
  }
  if (value.length >= 8 && hasUpper && hasLower && hasNumber) {
    return { label: "Good", color: "bg-yellow-500", width: "75%" };
  }
  if (value.length >= 8 && /[a-zA-Z]/.test(value) && hasNumber) {
    return { label: "Fair", color: "bg-orange-500", width: "50%" };
  }
  return { label: "Weak", color: "bg-red-500", width: "25%" };
}

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  showStrength,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const strength = getStrength(value);

  return (
    <div>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          required={required}
          value={value}
          onChange={onChange}
          className="mt-2 w-full rounded-xl bg-[--bg-input] border border-[--border] px-4 py-3 pr-11 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-[--text-primary] placeholder:text-[--text-muted]"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary] transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4.5 w-4.5" />
          ) : (
            <Eye className="h-4.5 w-4.5" />
          )}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[--border]">
            <div
              className={`h-full rounded-full ${strength.color} transition-all duration-300`}
              style={{ width: strength.width }}
            />
          </div>
          <span className="text-xs text-[--text-muted]">{strength.label}</span>
        </div>
      )}
    </div>
  );
}
