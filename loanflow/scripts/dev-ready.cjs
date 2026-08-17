const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const child = spawn("npm", ["run", "dev"], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
  shell: true,
});

function check(port, urlPath = "/") {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: urlPath, timeout: 500 },
      (res) => {
        res.resume();
        resolve(true);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

(async () => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const web = await check(3000);
    const api = await check(4000, "/api/auth/login");
    if (web && api) return;
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
  }
  console.error("Timed out waiting for :3000 and :4000");
  child.kill();
  process.exit(1);
})();

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
