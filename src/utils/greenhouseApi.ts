import type { PayloadRequest } from 'payload'

import type { PayloadGreenhouseConfig } from '../index.js'

// Helper function to get Greenhouse API headers with authentication
export const getGreenhouseHeaders = (apiKey?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add authentication if API key is provided
  if (apiKey) {
    const authHeader = Buffer.from(`${apiKey}:`).toString('base64')
    headers.Authorization = `Basic ${authHeader}`
  }

  return headers
}

// Type definitions for settings and job data
type GreenhouseSettings = {
  apiKey?: string
  cacheExpiryTime?: number
  urlToken?: string
}

type GreenhouseOffice = {
  child_ids: number[]
  departments: GreenhouseDepartment[]
  id: number
  location: null | string
  name: string
  parent_id: null | number
}

type GreenhouseDepartment = {
  child_ids: number[]
  id: number
  jobs: GreenhouseJob[]
  name: string
  parent_id: null | number
}

type GreenhouseJob = {
  absolute_url: string
  company_name: string
  content?: string
  data_compliance: Array<{
    demographic_data_consent_applies: boolean
    requires_consent: boolean
    requires_processing_consent: boolean
    requires_retention_consent: boolean
    retention_period: null | number
    type: string
  }>
  first_published: string
  id: number
  internal_job_id: number
  location?: { name: string }
  metadata: any
  requisition_id: string
  title: string
  updated_at: string
}

type GreenhouseJobDetails = {
  questions?: any[]
}

// Helper function to get settings from plugin options or environment variables
const getGreenhouseSettings = (pluginOptions: PayloadGreenhouseConfig): GreenhouseSettings => {
  return {
    apiKey: pluginOptions.apiKey || process.env.GREENHOUSE_API_KEY,
    cacheExpiryTime: pluginOptions.cacheExpiryTime || 3600,
    urlToken: pluginOptions.urlToken || process.env.GREENHOUSE_URL_TOKEN,
  }
}

// Handler for fetching jobs from Greenhouse
export const greenhouseJobsHandler = async (
  req: PayloadRequest,
  pluginOptions: PayloadGreenhouseConfig,
): Promise<Response> => {
  try {
    const payload = req.payload

    // Get settings from plugin options instead of global
    const settings = getGreenhouseSettings(pluginOptions)

    if (!settings || !settings.urlToken) {
      return new Response(
        JSON.stringify({
          error:
            'Greenhouse URL token is required. Please set GREENHOUSE_URL_TOKEN environment variable.',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Check for refresh parameter in the URL if available
    const url = req.url || ''
    const forceRefresh = url.includes('refresh=true')

    // Fetch from Greenhouse API - use offices endpoint as primary source
    const officesResponse = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${settings.urlToken}/offices`,
    )

    if (!officesResponse.ok) {
      const errorMessage = `Greenhouse API error: ${officesResponse.status} - ${officesResponse.statusText}`
      console.error(errorMessage)
      return new Response(JSON.stringify({ error: errorMessage }), {
        headers: { 'Content-Type': 'application/json' },
        status: officesResponse.status,
      })
    }

    const officesData = await officesResponse.json()
    const offices = officesData.offices || ([] as GreenhouseOffice[])

    // Extract all jobs from all offices and departments
    const allJobs: Array<{
      department: GreenhouseDepartment
      job: GreenhouseJob
      office: GreenhouseOffice
    }> = []
    const seenJobIds = new Set<number>()

    for (const office of offices) {
      if (office.departments && office.departments.length > 0) {
        for (const department of office.departments) {
          if (department.jobs && department.jobs.length > 0) {
            for (const job of department.jobs) {
              // Only add job if we haven't seen this job ID before
              if (!seenJobIds.has(job.id)) {
                seenJobIds.add(job.id)
                allJobs.push({ department, job, office })
              }
            }
          }
        }
      }
    }

    // Process jobs data
    const processedJobs = []
    for (const { department, job, office } of allJobs) {
      // Fetch detailed job info including questions
      const jobDetailsResponse = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${settings.urlToken}/jobs/${job.id}`,
      )

      let jobDetails: GreenhouseJobDetails = {}
      if (jobDetailsResponse.ok) {
        jobDetails = await jobDetailsResponse.json()
      }

      console.log('jobDetails', jobDetails)

      processedJobs.push({
        id: job.id,
        slug: job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        absoluteUrl: job.absolute_url,
        companyName: job.company_name,
        content: job.content || '',
        dataCompliance: job.data_compliance || [],
        department: department.name,
        departmentId: department.id,
        firstPublished: job.first_published,
        internalJobId: job.internal_job_id,
        jobId: job.id,
        location: job.location?.name || '',
        metadata: job.metadata,
        office: office.name,
        officeId: office.id,
        questions: jobDetails.questions || [],
        requisitionId: job.requisition_id,
        title: job.title,
        updatedAt: job.updated_at,
      })
    }

    return new Response(JSON.stringify(processedJobs), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Greenhouse plugin error:', error)
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: 'Failed to fetch job listings. Please try again later.',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}

// Handler for submitting job applications
export const greenhouseApplyHandler = async (
  req: PayloadRequest,
  pluginOptions: PayloadGreenhouseConfig,
): Promise<Response> => {
  try {
    const payload = req.payload

    // Get settings from plugin options instead of global
    const settings = getGreenhouseSettings(pluginOptions)

    if (!settings || !settings.apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'Greenhouse API key is required for application submissions. Please set GREENHOUSE_API_KEY environment variable.',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const body = await (req as unknown as Request).json()
    const { formData, jobId } = body

    if (!jobId || !formData) {
      return new Response(JSON.stringify({ error: 'Job ID and form data are required.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Submit to Greenhouse API using the headers helper
    const headers = getGreenhouseHeaders(settings.apiKey)

    const response = await fetch('https://harvest.greenhouse.io/v1/applications', {
      body: JSON.stringify({
        job_id: jobId,
        ...formData,
      }),
      headers,
      method: 'POST',
    })

    if (!response.ok) {
      let errorMessage = `Greenhouse API error: ${response.status} - ${response.statusText}`

      try {
        const errorData = await response.json()
        errorMessage += ` - ${JSON.stringify(errorData)}`
      } catch (e) {
        // If response cannot be parsed as JSON, continue with basic error
      }

      console.error(errorMessage)
      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to submit application. Please try again later.',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: response.status,
        },
      )
    }

    const responseData = await response.json()
    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Greenhouse application submission error:', error)
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: 'Failed to submit application. Please try again later.',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}

// Handler for clearing the job cache
export const greenhouseClearCacheHandler = (req: PayloadRequest): Promise<Response> => {
  try {
    // Since we're not using global settings for caching, this handler
    // could clear any alternative cache you implement, or simply return success
    return Promise.resolve(
      new Response(
        JSON.stringify({
          jobsRemoved: 0,
          message: 'Cache clearing not implemented for environment variable configuration',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error clearing Greenhouse cache:', error)
    return Promise.resolve(
      new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to clear job cache. Please try again later.',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        },
      ),
    )
  }
}
