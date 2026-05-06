const fs = require("fs");
const path = require("path");

const distIndexPath = path.join(__dirname, "..", "dist", "index.html");

if (!fs.existsSync(distIndexPath)) {
  throw new Error("dist/index.html was not found. Run the Expo web export first.");
}

let html = fs.readFileSync(distIndexPath, "utf8");

const tags = [
  '<meta name="theme-color" content="#ffffff" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Splitit" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<link rel="manifest" href="/manifest.json" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />'
];

for (const tag of tags) {
  if (!html.includes(tag)) {
    html = html.replace("</head>", `  ${tag}\n</head>`);
  }
}

fs.writeFileSync(distIndexPath, html);
