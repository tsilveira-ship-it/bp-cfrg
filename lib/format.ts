export const fmtCurrency = (v: number, opts?: { decimals?: number; compact?: boolean }) => {
  const compact = opts?.compact ?? false;
  const decimals = opts?.decimals ?? 0;
  if (compact && Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
};

export const fmtPct = (v: number, decimals = 1) =>
  new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);

export const fmtNum = (v: number, decimals = 0) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
