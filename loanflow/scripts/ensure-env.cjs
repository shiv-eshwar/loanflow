const fs = require("fs");
const path = require("path");

const dest = path.join(__dirname, "../api/.env");
const src = path.join(__dirname, "../api/.env.example");

if (!fs.existsSync(dest)) {
  fs.copyFileSync(src, dest);
  console.log("Created api/.env from .env.example");
}
