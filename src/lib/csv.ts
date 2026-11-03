/** CSV pro Excel v české lokalizaci: oddělovač středník, UTF-8 s BOM, řádky CRLF. */

export function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  // ochrana proti vložení vzorce (Excel spustí buňku začínající =, +, -, @)
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s) ? `'${s}` : s;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

/** Částka v haléřích/centech jako číslo s desetinnou čárkou (Excel ho načte jako číslo). */
export function csvAmount(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
