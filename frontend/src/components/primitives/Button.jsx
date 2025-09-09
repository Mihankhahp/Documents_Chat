import React from "react";
import { cn } from "../../lib/ui";

export default function Button({ children, variant = "primary", className, ...rest }) {
  const styles =
    variant === "primary"
      ? "bg-gray-900 text-white hover:bg-black"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : variant === "ghost"
      ? "bg-transparent hover:bg-gray-50"
      : "bg-gray-100 hover:bg-gray-200";
  return (
    <button
      className={cn(
        "px-3 py-2 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
