"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => window.print()}>
      Tisk / PDF
    </button>
  );
}
