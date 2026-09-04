import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const serverEntry = fileURLToPath(new URL('../server/index.mjs', import.meta.url))
const viteEntry = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))

const processes = [
  {
    name: 'API',
    command: process.execPath,
    args: [serverEntry],
    env: { ...process.env, NODE_ENV: 'development' },
  },
  {
    name: 'WEB',
    command: process.execPath,
    args: [viteEntry, '--host', '0.0.0.0'],
    env: process.env,
  },
]

const children = []
let shuttingDown = false

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) return

  // child.kill() is intentionally used without an explicit POSIX signal.
  // This is compatible with Windows as well as macOS/Linux.
  try {
    child.kill()
  } catch {
    // The process may already have exited between the checks above.
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  children.forEach(stopChild)
  process.exitCode = exitCode
}

for (const spec of processes) {
  const child = spawn(spec.command, spec.args, {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: 'inherit',
    env: spec.env,
    windowsHide: false,
  })

  children.push(child)

  child.on('error', error => {
    console.error(`\n[${spec.name}] No se pudo iniciar el proceso:`)
    console.error(error)
    shutdown(1)
  })

  child.on('exit', code => {
    if (!shuttingDown && code !== 0) {
      console.error(`\n[${spec.name}] terminó con código ${code}. Cerrando el entorno de desarrollo.`)
      shutdown(code || 1)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('exit', () => children.forEach(stopChild))

await Promise.all(
  children.map(
    child =>
      new Promise(resolve => {
        child.once('close', resolve)
      }),
  ),
)
