const { spawn } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const repoRoot = path.resolve(__dirname, "..")
const candidates =
  process.platform === "win32"
    ? [".venv/Scripts/python.exe", ".venv/Scripts/python"]
    : [".venv/bin/python", ".venv/bin/python3"]

const python =
  process.env.PYTHON ||
  candidates.map((candidate) => path.join(repoRoot, candidate)).find((candidate) => fs.existsSync(candidate)) ||
  "python"

const child = spawn(python, process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
})

child.on("error", (error) => {
  console.error(error.message)
  process.exit(1)
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
