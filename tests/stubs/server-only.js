// Vitest stub for the "server-only" package. The real module throws when
// imported outside a React Server context, which is exactly what importing a
// route handler in a test does — the poison-pill guard is a Next.js build
// concern, not a test one.
module.exports = {};
