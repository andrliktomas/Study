"use client";

// Záchranná stránka pro chyby v kořenovém layoutu (vlastní <html>, bez stylů aplikace).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="cs">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "6rem 1rem", color: "#0f2a2e", background: "#fff" }}>
        <h1 style={{ fontSize: "1.5rem" }}>Něco se pokazilo</h1>
        <p style={{ color: "#46636a" }}>Zkuste prosím stránku načíst znovu.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "1.5rem", background: "#14b8b8", color: "#fff", border: 0, borderRadius: 12, padding: "0.7rem 1.2rem", fontWeight: 600 }}
        >
          Zkusit znovu
        </button>
      </body>
    </html>
  );
}
