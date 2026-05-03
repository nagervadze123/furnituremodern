// Test-time stand-in for the `server-only` package. Imported by vitest
// via the alias in vitest.config.ts so server-marked modules can be
// unit-tested outside Next's runtime, where the real package's runtime
// guard would throw.
export {};
