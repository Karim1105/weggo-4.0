import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { setupIndices } from './es-setup'

const repoRoot = process.cwd()
const require = createRequire(import.meta.url)

type RunOptions = {
  allowFailure?: boolean
  stdio?: 'inherit' | 'pipe'
}

function run(command: string, args: string[], options: RunOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(resolveCommand(command), args, {
      cwd: repoRoot,
      stdio: options.stdio ?? 'inherit',
      shell: false,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0 || options.allowFailure) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`))
    })
  })
}

function runDetached(command: string, args: string[]) {
  const child = spawn(resolveCommand(command), args, {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: false,
  })

  child.unref()
}

function resolveCommand(command: string) {
  if (process.platform !== 'win32') {
    return command
  }

  if (command.includes('\\') || command.includes('/') || command.endsWith('.exe')) {
    return command
  }

  if (command === 'npm' || command === 'npx') {
    return `${command}.cmd`
  }

  return command
}

async function commandWorks(command: string, args: string[]) {
  try {
    await run(command, args, { allowFailure: false, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(check: () => Promise<boolean>, timeoutMs: number, stepMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await check()) {
      return true
    }

    await wait(stepMs)
  }

  return false
}

function getDockerDesktopPath() {
  const candidates = [
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Docker', 'Docker', 'Docker Desktop.exe'),
  ].filter(Boolean)

  return candidates.find((candidate) => fs.existsSync(candidate))
}

async function ensureDockerCli() {
  if (await commandWorks('docker', ['--version'])) {
    return
  }

  if (process.platform === 'win32' && (await commandWorks('winget', ['--version']))) {
    console.log('Docker CLI not found. Installing Docker Desktop with winget...')
    await run('winget', [
      'install',
      '-e',
      '--id',
      'Docker.DockerDesktop',
      '--accept-source-agreements',
      '--accept-package-agreements',
    ])

    if (await commandWorks('docker', ['--version'])) {
      return
    }
  }

  throw new Error('Docker is not installed. Install Docker Desktop, then rerun `npm run start`.')
}

async function dockerDaemonReady() {
  return commandWorks('docker', ['info', '--format', '{{json .ServerVersion}}'])
}

async function ensureDockerDaemon() {
  if (await dockerDaemonReady()) {
    return
  }

  if (process.platform === 'win32') {
    const dockerDesktopPath = getDockerDesktopPath()

    if (dockerDesktopPath) {
      console.log('Starting Docker Desktop...')
      runDetached(dockerDesktopPath, [])
      const ready = await waitFor(dockerDaemonReady, 120_000, 3_000)

      if (ready) {
        return
      }

      throw new Error('Docker Desktop was launched but the daemon did not become ready within 120 seconds.')
    }
  }

  throw new Error('Docker daemon is not running. Start Docker Desktop, then rerun `npm run start`.')
}

async function ensureLocalServices() {
  console.log('Ensuring local Elasticsearch container is running...')
  await run('docker', ['compose', 'up', '-d', 'elasticsearch'])

  const elasticReady = await waitFor(checkElasticHttpReady, 90_000, 3_000)

  if (!elasticReady) {
    throw new Error('Elasticsearch container did not become reachable on localhost:9200.')
  }
}

function checkElasticHttpReady() {
  return new Promise<boolean>((resolve) => {
    const request = http.get('http://127.0.0.1:9200', (response) => {
      response.resume()
      resolve((response.statusCode || 0) >= 200 && (response.statusCode || 0) < 500)
    })

    request.setTimeout(1_500, () => {
      request.destroy()
      resolve(false)
    })

    request.on('error', () => resolve(false))
  })
}

function checkPortListening(port: number, host: string) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ port, host })
    let settled = false

    const finish = (value: boolean) => {
      if (settled) {
        return
      }

      settled = true
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(1_000)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function main() {
  const port = Number(process.env.PORT || '3000')

  await ensureDockerCli()
  await ensureDockerDaemon()
  await ensureLocalServices()
  await setupIndices()
  if (await checkPortListening(port, '127.0.0.1')) {
    throw new Error(`Port ${port} is already in use. Stop the existing app process or set a different PORT before running \`npm run start\`.`)
  }
  await run(process.execPath, [resolvePackageBin('next/dist/bin/next'), 'start'])
}

function resolvePackageBin(modulePath: string) {
  return require.resolve(modulePath, { paths: [repoRoot] })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
