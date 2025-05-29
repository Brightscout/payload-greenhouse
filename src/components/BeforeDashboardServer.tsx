import type { PayloadRequest } from 'payload'

import { getPluginOptions } from '../index.js'
import { greenhouseJobsHandler } from '../utils/greenhouseApi.js'
import { BeforeDashboardClient } from './BeforeDashboardClient.js'

type GreenhouseJob = {
  absoluteUrl?: string
  department: string
  id: string
  jobId?: number
  location: string
  office: string
  requisitionId?: string
  status?: string
  title: string
  updatedAt: string
}

type GreenhouseSettings = {
  apiKey?: string
  boardType?: string
  cacheExpiryTime?: number
  debug?: boolean
  formType?: string
  urlToken?: string
}

export const BeforeDashboardServer = async (props?: any) => {
  const pluginOptions = getPluginOptions()

  if (!pluginOptions) {
    console.error('Plugin options not available')
    return <BeforeDashboardClient jobs={[]} settings={undefined} />
  }

  try {
    let jobs: GreenhouseJob[] = []
    let settings: GreenhouseSettings | undefined = undefined

    // Get settings from plugin options and environment variables
    settings = {
      apiKey: pluginOptions.apiKey || process.env.GREENHOUSE_API_KEY,
      boardType: pluginOptions.boardType,
      cacheExpiryTime: pluginOptions.cacheExpiryTime,
      debug: pluginOptions.debug,
      formType: pluginOptions.formType,
      urlToken: pluginOptions.urlToken || process.env.GREENHOUSE_URL_TOKEN,
    }

    // Call the API handler directly (same pattern as HubSpot plugin)
    try {
      const response = await greenhouseJobsHandler({ query: {} } as PayloadRequest, pluginOptions)
      const jobsData = await response.json()

      // Transform the jobs data to match the expected format with more details
      jobs = (jobsData || []).map((job: any) => ({
        id: String(job.id || job.jobId),
        absoluteUrl: job.absoluteUrl || '',
        department: job.department || '',
        jobId: job.jobId || job.id,
        location: job.location || '',
        office: job.office || '',
        requisitionId: job.requisitionId || '',
        status: job.status || 'active',
        title: job.title || '',
        updatedAt: job.updatedAt || '',
      }))
    } catch (error) {
      console.error('Error fetching jobs via handler:', error)
      jobs = []
    }

    return <BeforeDashboardClient jobs={jobs} settings={settings} />
  } catch (err) {
    console.error('Error in Greenhouse dashboard:', err)
    return <BeforeDashboardClient jobs={[]} settings={undefined} />
  }
}
