export function resolveFlagUrl(flagUrl) {
  if (!flagUrl) return null;
  if (flagUrl.startsWith("http://") || flagUrl.startsWith("https://")) return flagUrl;
  if (flagUrl.startsWith("<svg") || flagUrl.startsWith("<?xml")) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(flagUrl);
  }
  if (flagUrl.startsWith("/")) return flagUrl;
  return "/" + flagUrl;
}

export function renderFlag(team, cssClass = "team-flag", altAttr, inlineStyle = "") {
  const url = resolveFlagUrl(team?.flag_url);
  const alt = altAttr || team?.name || "flag";
  const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : "";
  if (url) {
    return `<img class="${cssClass}" src="${url}" alt="${alt}"${styleAttr}>`;
  }
  const code = (team?.fifa_code || "?").slice(0, 3).toUpperCase();
  return `<span class="flag-placeholder ${cssClass}" title="Sin bandera">${code}</span>`;
}
