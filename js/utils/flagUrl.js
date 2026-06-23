const ISO_TO_V2 = {
  es: "flag-spainV2.svg",
  sp: "flag-spainV2.svg",
  fr: "flag-fraV2.svg",
  gb: "flag-englandV2.svg",
  "gb-eng": "flag-englandV2.svg",
  us: "flag-usaV2.svg",
  mx: "flag-mexV2.svg",
  jp: "flag-japonV2.svg",
  dk: "flag-denmarkV2.svg",
  nz: "flag-new-zelandV2.svg",
  wales: "flag-walesV2.svg",
  "gb-wls": "flag-walesV2.svg",
  sd: "flag-sudV2.svg",
  sa: "flag-sudV2.svg",
  arab: "flag-sudV2.svg",
};

const FALLBACK = "/assets/images/tbd-flag.svg";

export function resolveFlagUrl(flagUrl) {
  if (!flagUrl) return FALLBACK;
  if (flagUrl.startsWith("http://") || flagUrl.startsWith("https://")) return flagUrl;
  if (flagUrl.startsWith("<svg") || flagUrl.startsWith("<?xml")) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(flagUrl);
  }

  const match = flagUrl.match(/(?:^|\/)([a-z]{2,6}(?:-[a-z]{2,3})?)\.svg$/i);
  if (match && ISO_TO_V2[match[1].toLowerCase()]) {
    return "/assets/images/" + ISO_TO_V2[match[1].toLowerCase()];
  }

  if (flagUrl.startsWith("/")) return flagUrl;
  return "/" + flagUrl;
}
