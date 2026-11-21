// Run: npx tsx scripts/diagnose.check.ts
import assert from "node:assert";
import { diagnose } from "../src/lib/diagnose";

const c = (statusCode: number | null, errorMessage: string | null, extra = {}) => diagnose({ statusCode, errorMessage, ...extra }).cause;

assert.equal(c(null, "getaddrinfo ENOTFOUND example.invalid"), "DNS lookup failed");
assert.equal(c(null, "connect ECONNREFUSED 1.2.3.4:443"), "Connection refused");
assert.equal(c(null, "timeout of 10000ms exceeded"), "No response (timeout)");
assert.equal(c(null, "certificate has expired"), "SSL certificate expired");
assert.equal(c(null, "unable to verify the first certificate"), "SSL/TLS error");
assert.equal(c(null, "read ECONNRESET"), "Connection dropped");
assert.equal(c(200, 'Keyword "Welcome" not found'), "Expected content missing");
assert.equal(c(502, "Request failed with status code 502"), "Gateway error (HTTP 502)");
assert.equal(c(500, "HTTP 500"), "Server error (HTTP 500)");
assert.equal(c(404, "HTTP 404"), "Page not found (HTTP 404)");
assert.match(diagnose({ statusCode: 500, errorMessage: "x", responseTimeMs: 9000, typicalMs: 300 }).detail, /30x slower/);
console.log("diagnose: all checks passed");
