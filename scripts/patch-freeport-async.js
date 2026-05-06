const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "node_modules", "freeport-async", "index.js");

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, "utf8");
const testNeedle = "function testPortAsync(port, hostname) {\n";
const testReplacement = "function testPortAsync(port, hostname) {\n  if (port < 0 || port > 65535) return Promise.resolve(false);\n";
const rangeNeedle = "    var lowPort = rangeStart || DEFAULT_PORT_RANGE_START;\n";
const rangeReplacement = "    var lowPort = rangeStart || DEFAULT_PORT_RANGE_START;\n    if (lowPort > 65535) lowPort = DEFAULT_PORT_RANGE_START;\n";

let next = source;
if (!next.includes(testReplacement)) {
  next = next.replace(testNeedle, testReplacement);
}
if (!next.includes(rangeReplacement)) {
  next = next.replace(rangeNeedle, rangeReplacement);
}

if (next !== source) {
  fs.writeFileSync(target, next);
  console.log("Patched freeport-async for Node 24 port validation.");
}
