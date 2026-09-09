const HTML_ESCAPE = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
};
export function sanitizeInput(input) {
    if (typeof input !== "string")
        return "";
    return input
        .replace(/[&<>"'/]/g, (c) => HTML_ESCAPE[c] || c)
        .trim()
        .slice(0, 500);
}
export function sanitizeEmail(email) {
    const cleaned = sanitizeInput(email).toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : "";
}
export function sanitizeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}
export function sanitizeSearchQuery(query) {
    return sanitizeInput(query).replace(/[^\w\s\-.'()]/g, "").slice(0, 100);
}
