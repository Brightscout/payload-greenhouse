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

type GreenhouseJob = {
  content: string
  departments?: Array<{ id: number; name: string }>
  id: number
  location?: { name: string }
  offices?: Array<{ id: number; name: string }>
  title: string
}

type GreenhouseJobDetails = {
  questions?: any[]
}

// Handler for fetching jobs from Greenhouse
export const greenhouseJobsHandler = async (
  req: PayloadRequest,
  pluginOptions: PayloadGreenhouseConfig,
): Promise<Response> => {
  try {
    const payload = req.payload

    // Get settings
    const settingsQuery = await payload.find({
      collection: 'greenhouse-settings' as any,
      limit: 1,
    })

    const settings = settingsQuery.docs[0] as unknown as GreenhouseSettings

    if (!settings || !settings.urlToken) {
      return new Response(
        JSON.stringify({
          error: 'Greenhouse URL token is required. Please configure the plugin settings.',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Check cache first
    const cachedJobsQuery = await payload.find({
      collection: 'greenhouse-jobs' as any,
      limit: 1000,
    })

    const cacheTime = settings.cacheExpiryTime || pluginOptions.cacheExpiryTime || 3600
    const lastUpdated =
      cachedJobsQuery.docs.length > 0 ? new Date(cachedJobsQuery.docs[0].updatedAt).getTime() : 0
    const now = new Date().getTime()
    const cacheExpired = now - lastUpdated > cacheTime * 1000

    // Check for refresh parameter in the URL if available
    const url = req.url || ''
    const forceRefresh = url.includes('refresh=true')

    // Return cached jobs if cache not expired and not forcing refresh
    if (cachedJobsQuery.docs.length > 0 && !cacheExpired && !forceRefresh) {
      return new Response(JSON.stringify(cachedJobsQuery.docs), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Fetch from Greenhouse API
    const response = await fetch(`https://api.greenhouse.io/v1/boards/${settings.urlToken}/jobs`)

    if (!response.ok) {
      const errorMessage = `Greenhouse API error: ${response.status} - ${response.statusText}`
      console.error(errorMessage)
      return new Response(JSON.stringify({ error: errorMessage }), {
        headers: { 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    const greenhouseData = await response.json()

    // Clear existing cache
    if (cachedJobsQuery.docs.length > 0) {
      for (const job of cachedJobsQuery.docs) {
        await payload.delete({
          id: job.id,
          collection: 'greenhouse-jobs' as any,
        })
      }
    }

    // Store jobs in collection
    const jobs = greenhouseData.jobs || ([] as GreenhouseJob[])

    // Fetch all job details in parallel
    const jobDetailsPromises = jobs.map(async (job: GreenhouseJob) => {
      try {
        const jobDetailsResponse = await fetch(
          `https://api.greenhouse.io/v1/boards/${settings.urlToken}/jobs/${job.id}`,
        )

        if (!jobDetailsResponse.ok) {
          console.error(
            `Failed to fetch details for job ${job.id}: ${jobDetailsResponse.status} - ${jobDetailsResponse.statusText}`,
          )
          return null
        }

        const jobDetails = (await jobDetailsResponse.json()) as GreenhouseJobDetails
        return {
          details: jobDetails,
          job,
        }
      } catch (error) {
        console.error(`Error fetching details for job ${job.id}:`, error)
        return null
      }
    })

    const jobDetailsResults = await Promise.all(jobDetailsPromises)
    const processedJobs = []

    // Process job results
    for (const result of jobDetailsResults) {
      if (!result) {
        continue
      }

      const { details, job } = result

      try {
        const createdJob = await payload.create({
          collection: 'greenhouse-jobs' as any,
          data: {
            slug: job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            content: job.content,
            department: job.departments?.[0]?.name || '',
            departmentId: job.departments?.[0]?.id || null,
            jobId: job.id,
            location: job.location?.name || '',
            office: job.offices?.[0]?.name || '',
            officeId: job.offices?.[0]?.id || null,
            questions: details.questions || [],
            title: job.title,
          },
        })

        processedJobs.push(createdJob)
      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError)
      }
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

    // Get settings
    const settingsQuery = await payload.find({
      collection: 'greenhouse-settings' as any,
      limit: 1,
    })

    const settings = settingsQuery.docs[0] as unknown as GreenhouseSettings

    if (!settings || !settings.apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Greenhouse API key is required for application submissions.',
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
export const greenhouseClearCacheHandler = async (req: PayloadRequest): Promise<Response> => {
  try {
    const payload = req.payload

    const cachedJobsQuery = await payload.find({
      collection: 'greenhouse-jobs' as any,
      limit: 1000,
    })

    if (cachedJobsQuery.docs.length > 0) {
      for (const job of cachedJobsQuery.docs) {
        await payload.delete({
          id: job.id,
          collection: 'greenhouse-jobs' as any,
        })
      }
    }

    return new Response(
      JSON.stringify({
        jobsRemoved: cachedJobsQuery.docs.length,
        message: 'Cache cleared successfully',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error clearing Greenhouse cache:', error)
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: 'Failed to clear job cache. Please try again later.',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}
