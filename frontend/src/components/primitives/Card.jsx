import React from "react";
import { cn } from "../../lib/ui";

export default function Card({ title, right, children, className }) {
  return (
    <div className={cn("rounded-2xl shadow-sm border border-gray-200 bg-white", className)}>
      {(title || right) && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          <div>{right}</div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
