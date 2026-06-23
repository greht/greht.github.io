export function resolveFlagUrl(flagUrl) {
    if (!flagUrl) return "/assets/images/predictilab-gray.svg"
    if (flagUrl.startsWith("http://") || flagUrl.startsWith("https://")) return flagUrl
    if (flagUrl.startsWith("<svg") || flagUrl.startsWith("<?xml")) {
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(flagUrl)
    }
    let path = flagUrl
    if (path.startsWith("/")) return path
    return "/" + path
}
