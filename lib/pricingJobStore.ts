import { analyzePricing, PricingProgressUpdate, PricingResult } from '@/lib/pricingAnalysis'
import crypto from 'crypto'

export type PricingJobStep = {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
}

export type PricingJob = {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  progress: number
  steps: PricingJobStep[]
  result?: PricingResult
  error?: string
  createdAt: string
}

type StoredPricingJob = PricingJob & { ownerId: string; expiresAt: number }

// Jobs live in memory, so bound both their lifetime and their count.
const JOB_TTL_MS = 15 * 60 * 1000
const MAX_JOBS = 1000

const JOBS = new Map<string, StoredPricingJob>()

function pruneJobs() {
  const now = Date.now()
  for (const [id, job] of JOBS) {
    if (job.expiresAt <= now) JOBS.delete(id)
  }
  // Map preserves insertion order, so the first keys are the oldest.
  while (JOBS.size >= MAX_JOBS) {
    const oldest = JOBS.keys().next().value
    if (oldest === undefined) break
    JOBS.delete(oldest)
  }
}

const DEFAULT_STEPS: PricingJobStep[] = [
  { id: 'prepare', label: 'Preparing input', status: 'pending' },
  { id: 'match', label: 'Finding similar listings', status: 'pending' },
  { id: 'compute', label: 'Calculating market price', status: 'pending' },
  { id: 'finalize', label: 'Finalizing suggestion', status: 'pending' }
]

export function createPricingJob(input: {
  title: string
  description: string
  category: string
  condition: string
}, ownerId: string): PricingJob {
  pruneJobs()
  const id = crypto.randomUUID()

  const job: StoredPricingJob = {
    ownerId,
    expiresAt: Date.now() + JOB_TTL_MS,
    id,
    status: 'queued',
    progress: 0,
    steps: DEFAULT_STEPS.map((step) => ({ ...step })),
    createdAt: new Date().toISOString()
  }

  JOBS.set(id, job)
  const { ownerId: _ownerId, expiresAt: _expiresAt, ...publicJob } = job

  runJob(id, input)
    .catch((error) => {
      updateJob(id, {
        status: 'error',
        error: 'Pricing job failed'
      })
    })

  return publicJob
}

export function getPricingJob(id: string, ownerId: string): PricingJob | null {
  const job = JOBS.get(id)
  if (!job || job.ownerId !== ownerId || job.expiresAt <= Date.now()) return null
  const { ownerId: _ownerId, expiresAt: _expiresAt, ...publicJob } = job
  return publicJob
}

function updateJob(id: string, update: Partial<PricingJob>) {
  const existing = JOBS.get(id)
  if (!existing) return
  JOBS.set(id, { ...existing, ...update })
}

function updateStep(id: string, progressUpdate: PricingProgressUpdate) {
  const job = JOBS.get(id)
  if (!job) return

  const steps = job.steps.map((step) =>
    step.id === progressUpdate.stepId
      ? {
          ...step,
          status: progressUpdate.status,
          message: progressUpdate.message || step.message
        }
      : step
  )

  JOBS.set(id, {
    ...job,
    steps,
    progress: progressUpdate.progress
  })
}

async function runJob(
  id: string,
  input: {
    title: string
    description: string
    category: string
    condition: string
  }
) {
  updateJob(id, { status: 'running' })

  const result = await analyzePricing(input, (progressUpdate) => {
    updateStep(id, progressUpdate)
  })

  updateJob(id, {
    status: 'done',
    progress: 100,
    result
  })
}
