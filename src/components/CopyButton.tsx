"use client";
import { useState } from "react";

export function CopyButton({ value, label = "Kopírovat" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary px-3 py-1.5 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Zkopírováno ✓" : label}
    </button>
  );
}
