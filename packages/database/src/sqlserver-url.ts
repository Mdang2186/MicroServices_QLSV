export function normalizeSqlServerUrl(url?: string | null) {
  const raw = `${url || ""}`.trim();
  if (!raw || !/^sqlserver:/i.test(raw)) {
    return raw;
  }

  let normalized = raw;
  const ensureTrailingSemicolon = () => {
    if (!normalized.endsWith(";")) {
      normalized += ";";
    }
  };

  if (/;\s*encrypt\s*=/i.test(normalized)) {
    normalized = normalized.replace(
      /;\s*encrypt\s*=\s*[^;]*/i,
      ";encrypt=DANGER_PLAINTEXT",
    );
  } else {
    ensureTrailingSemicolon();
    normalized += "encrypt=DANGER_PLAINTEXT;";
  }

  if (!/;\s*trustServerCertificate\s*=/i.test(normalized)) {
    ensureTrailingSemicolon();
    normalized += "trustServerCertificate=true;";
  }

  return normalized;
}
