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

const JOBS = new Map<string, PricingJob>()

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
}): PricingJob {
  const id = crypto.randomUUID()

  const job: PricingJob = {
    id,
    status: 'queued',
    progress: 0,
    steps: DEFAULT_STEPS.map((step) => ({ ...step })),
    createdAt: new Date().toISOString()
  }

  JOBS.set(id, job)

  runJob(id, input)
    .catch((error) => {
      updateJob(id, {
        status: 'error',
        error: error?.message || 'Pricing job failed'
      })
    })

  return job
}

export function getPricingJob(id: string): PricingJob | null {
  return JOBS.get(id) || null
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
