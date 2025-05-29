import type { CollectionSlug, Config, PayloadRequest } from 'payload'

export type PayloadGreenhouseConfig = {
  /**
   * Your Greenhouse API key
   * Required for inline application forms
   */
  apiKey?: string
  /**
   * Board type: 'accordion' or 'cycle'
   * Default: 'accordion'
   */
  boardType?: 'accordion' | 'cycle'
  /**
   * Cache expiration time in seconds
   * Default: 3600 (1 hour)
   */
  cacheExpiryTime?: number
  collections?: Partial<Record<CollectionSlug, true>>
  /**
   * Transition effect for cycle view
   * Default: 'fade'
   */
  cycleFx?: 'fade' | 'fadeout' | 'none' | 'scrollHorz'
  /**
   * Enable debug mode
   */
  debug?: boolean
  /**
   * Disable the plugin
   */
  disabled?: boolean
  disableDashboard?: boolean
  /**
   * Form type: 'iframe' or 'inline'
   * Default: 'iframe'
   */
  formType?: 'iframe' | 'inline'
  /**
   * Your Greenhouse URL token
   * Required to connect to Greenhouse API
   */
  urlToken?: string
}

let pluginOptionsGlobal: null | PayloadGreenhouseConfig = null

export const getPluginOptions = () => pluginOptionsGlobal

// Add helper function to fetch available jobs
const fetchAvailableJobs = async (urlToken: string) => {
  try {
    const officesResponse = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${urlToken}/offices`,
    )

    if (!officesResponse.ok) {
      console.warn('Failed to fetch Greenhouse offices for job options')
      return []
    }

    const officesData = await officesResponse.json()
    const offices = officesData.offices || []

    const jobOptions: Array<{ label: string; value: number }> = []
    const seenJobIds = new Set<number>()

    for (const office of offices) {
      if (office.departments) {
        for (const department of office.departments) {
          if (department.jobs) {
            for (const job of department.jobs) {
              if (!seenJobIds.has(job.id)) {
                seenJobIds.add(job.id)
                jobOptions.push({
                  label: `${job.title} (ID: ${job.id}) - ${department.name}, ${office.name}`,
                  value: job.id,
                })
              }
            }
          }
        }
      }
    }

    return jobOptions.sort((a, b) => a.label.localeCompare(b.label))
  } catch (error) {
    console.error('Error fetching available jobs:', error)
    return []
  }
}

export const payloadGreenhouse =
  (pluginOptions: PayloadGreenhouseConfig) =>
  (config: Config): Config => {
    pluginOptionsGlobal = pluginOptions

    if (!config.collections) {
      config.collections = []
    }

    // Create Greenhouse jobs as a collection
    config.collections.push({
      slug: 'greenhouse-jobs',
      admin: {
        components: {
          beforeList: ['payload-greenhouse/rsc#BeforeDashboardServer'],
        },
        description: 'View and manage Greenhouse job listings',
        group: 'Integrations',
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'jobId',
          type: 'text',
          admin: {
            description: 'Enter a Greenhouse Job ID from available jobs listed in the dashboard.',
          },
          label: 'Job ID',
          required: true,
          unique: true,
          validate: async (val: null | string | undefined) => {
            if (!val) {
              return 'Job ID is required'
            }

            const urlToken = pluginOptionsGlobal?.urlToken || process.env.GREENHOUSE_URL_TOKEN
            if (!urlToken) {
              return 'URL token not configured'
            }

            try {
              // Use the same logic as the debug endpoint to ensure consistency
              const officesResponse = await fetch(
                `https://boards-api.greenhouse.io/v1/boards/${urlToken}/offices`,
              )

              if (!officesResponse.ok) {
                return 'Unable to validate Job ID - API error'
              }

              const officesData = await officesResponse.json()
              const offices = officesData.offices || []

              // Extract all Job IDs using the same logic as debug endpoint
              const availableJobIds: number[] = []
              const seenJobIds = new Set<number>()

              for (const office of offices) {
                if (office.departments) {
                  for (const department of office.departments) {
                    if (department.jobs) {
                      for (const job of department.jobs) {
                        if (!seenJobIds.has(job.id)) {
                          seenJobIds.add(job.id)
                          availableJobIds.push(job.id)
                        }
                      }
                    }
                  }
                }
              }

              const jobExists = availableJobIds.includes(parseInt(val, 10))
              return jobExists || `Job ID ${val} not found in Greenhouse`
            } catch (error) {
              return 'Error validating Job ID'
            }
          },
        },
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'Job title (automatically synced)',
            readOnly: true,
          },
          label: 'Job Title',
        },
        {
          name: 'location',
          type: 'text',
          admin: {
            description: 'Job location',
            readOnly: true,
          },
          label: 'Location',
        },
        {
          name: 'department',
          type: 'text',
          admin: {
            description: 'Department name',
            readOnly: true,
          },
          label: 'Department',
        },
        {
          name: 'office',
          type: 'text',
          admin: {
            description: 'Office location',
            readOnly: true,
          },
          label: 'Office',
        },
        {
          name: 'publishedDate',
          type: 'date',
          admin: {
            description: 'Date when the job was published',
            readOnly: true,
          },
          label: 'Published Date',
        },
        {
          name: 'updatedAt',
          type: 'date',
          admin: {
            description: 'Last update date',
            readOnly: true,
          },
          label: 'Last Updated',
          required: true,
        },
        {
          name: 'absoluteUrl',
          type: 'text',
          admin: {
            description: 'Direct link to the job application page',
            readOnly: true,
          },
          label: 'Application URL',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
          admin: {
            description: 'Job description and requirements',
            readOnly: true,
          },
          label: 'Job Description',
          required: true,
        },
        {
          name: 'companyName',
          type: 'text',
          admin: {
            description: 'Company name',
            readOnly: true,
          },
          label: 'Company Name',
          required: true,
        },
        {
          name: 'requisitionId',
          type: 'text',
          admin: {
            description: 'Internal requisition ID',
            readOnly: true,
          },
          label: 'Requisition ID',
          required: true,
        },
        {
          name: 'internalJobId',
          type: 'number',
          admin: {
            description: 'Internal job identifier',
            readOnly: true,
          },
          label: 'Internal Job ID',
          required: true,
        },
      ],
      hooks: {
        beforeChange: [
          async ({ data, operation, originalDoc, req }) => {
            // If jobId is provided, fetch job details from Greenhouse
            if (
              data.jobId &&
              (operation === 'create' || (originalDoc && data.jobId !== originalDoc.jobId))
            ) {
              const urlToken = pluginOptions.urlToken || process.env.GREENHOUSE_URL_TOKEN

              if (!urlToken) {
                throw new Error(
                  'Greenhouse URL token not configured. Please set GREENHOUSE_URL_TOKEN environment variable.',
                )
              }

              // Convert jobId to number if it's a string
              const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId

              if (!jobId || jobId <= 0) {
                throw new Error(`Invalid Job ID: ${jobId}. Please select a valid job.`)
              }

              // First, try to fetch job details from Greenhouse API
              const jobResponse = await fetch(
                `https://boards-api.greenhouse.io/v1/boards/${urlToken}/jobs/${jobId}`,
              )

              if (jobResponse.ok) {
                const jobDetails = await jobResponse.json()

                // Also fetch offices to get department and office info
                const officesResponse = await fetch(
                  `https://boards-api.greenhouse.io/v1/boards/${urlToken}/offices`,
                )

                if (officesResponse.ok) {
                  const officesData = await officesResponse.json()
                  const offices = officesData.offices || []

                  // Find the job in the offices structure to get department and office
                  let foundJobContext = null
                  for (const office of offices) {
                    if (office.departments) {
                      for (const department of office.departments) {
                        if (department.jobs) {
                          const job = department.jobs.find((j: any) => j.id === jobId)
                          if (job) {
                            foundJobContext = { department, job, office }
                            break
                          }
                        }
                      }
                    }
                    if (foundJobContext) {
                      break
                    }
                  }

                  // Populate fields with Greenhouse data
                  data.title = jobDetails.title || foundJobContext?.job.title || data.title
                  data.content =
                    jobDetails.content || foundJobContext?.job.content || data.content || ''
                  data.absoluteUrl =
                    jobDetails.absolute_url || foundJobContext?.job.absolute_url || data.absoluteUrl
                  data.companyName =
                    jobDetails.company_name || foundJobContext?.job.company_name || data.companyName
                  data.requisitionId =
                    jobDetails.requisition_id ||
                    foundJobContext?.job.requisition_id ||
                    data.requisitionId
                  data.internalJobId =
                    jobDetails.internal_job_id ||
                    foundJobContext?.job.internal_job_id ||
                    data.internalJobId
                  data.location =
                    jobDetails.location?.name ||
                    foundJobContext?.job.location?.name ||
                    data.location ||
                    ''
                  data.publishedDate =
                    jobDetails.first_published || foundJobContext?.job.first_published
                      ? new Date(
                          jobDetails.first_published || foundJobContext?.job.first_published || '',
                        )
                      : data.publishedDate

                  if (foundJobContext) {
                    data.department = foundJobContext.department.name
                    data.office = foundJobContext.office.name
                  }

                  // Set the numeric jobId
                  data.jobId = jobId
                } else {
                  console.warn('Failed to fetch offices data, but job details were retrieved')
                }
              } else {
                const errorText = await jobResponse.text()
                console.error(`Greenhouse API error: ${jobResponse.status} - ${errorText}`)

                if (jobResponse.status === 404) {
                  throw new Error(
                    `Job ID ${jobId} not found in Greenhouse. Please check the Job ID and try again.`,
                  )
                } else if (jobResponse.status === 401) {
                  throw new Error(
                    'Unauthorized access to Greenhouse API. Please check your URL token configuration.',
                  )
                } else {
                  throw new Error(`Greenhouse API error (${jobResponse.status}): ${errorText}`)
                }
              }
            }

            // For updates, preserve original values (all fields are now read-only after creation)
            if (operation === 'update' && originalDoc) {
              // All fields should be preserved from original document
              Object.keys(data).forEach((key) => {
                if (originalDoc[key] !== undefined) {
                  data[key] = originalDoc[key]
                }
              })
            }

            // Set updatedAt for all operations
            data.updatedAt = new Date().toISOString()

            return data
          },
        ],
      },
    })

    if (pluginOptions.collections) {
      for (const collectionSlug in pluginOptions.collections) {
        const collection = config.collections.find(
          (collection) => collection.slug === collectionSlug,
        )

        if (collection) {
          collection.fields.push({
            name: 'greenhouseJobBoard',
            type: 'group',
            admin: {
              description: 'Greenhouse Job Board settings for this collection',
              position: 'sidebar',
            },
            fields: [
              {
                name: 'enabled',
                type: 'checkbox',
                admin: {
                  description: 'Enable Greenhouse Job Board for this collection',
                },
                defaultValue: false,
              },
              {
                name: 'boardType',
                type: 'select',
                admin: {
                  condition: (data, siblingData) => siblingData.enabled,
                  description: 'Override default board type',
                },
                defaultValue: 'default',
                options: [
                  { label: 'Default', value: 'default' },
                  { label: 'Accordion', value: 'accordion' },
                  { label: 'Cycle', value: 'cycle' },
                ],
              },
            ],
          })
        }
      }
    }

    /**
     * If the plugin is disabled, we still want to keep added collections/fields so the database schema is consistent which is important for migrations.
     */
    if (pluginOptions.disabled) {
      return config
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    // Add an endpoint to fetch jobs from Greenhouse API
    config.endpoints.push({
      handler: async (req: PayloadRequest) => {
        // Import the handler dynamically to avoid CSS import issues
        const { greenhouseJobsHandler } = await import('./utils/greenhouseApi.js')
        return greenhouseJobsHandler(req, pluginOptions)
      },
      method: 'get',
      path: '/greenhouse/jobs',
    })

    // Add an endpoint to submit job applications
    config.endpoints.push({
      handler: async (req: PayloadRequest) => {
        const { greenhouseApplyHandler } = await import('./utils/greenhouseApi.js')
        return greenhouseApplyHandler(req, pluginOptions)
      },
      method: 'post',
      path: '/greenhouse/apply',
    })

    // Add a utility endpoint to clear the job cache
    config.endpoints.push({
      handler: async (req: PayloadRequest) => {
        const { greenhouseClearCacheHandler } = await import('./utils/greenhouseApi.js')
        return greenhouseClearCacheHandler(req)
      },
      method: 'post',
      path: '/greenhouse/clear-cache',
    })

    // Add a debug endpoint to help troubleshoot Job ID issues
    config.endpoints.push({
      handler: async (req: PayloadRequest) => {
        try {
          const urlToken = pluginOptions.urlToken || process.env.GREENHOUSE_URL_TOKEN

          if (!urlToken) {
            return new Response(
              JSON.stringify({
                envVarSet: !!process.env.GREENHOUSE_URL_TOKEN,
                error: 'Greenhouse URL token not configured',
                urlToken: null,
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
              },
            )
          }

          // Fetch offices to get all available Job IDs
          const officesResponse = await fetch(
            `https://boards-api.greenhouse.io/v1/boards/${urlToken}/offices`,
          )

          if (!officesResponse.ok) {
            return new Response(
              JSON.stringify({
                error: `Greenhouse API error: ${officesResponse.status}`,
                status: officesResponse.status,
                statusText: officesResponse.statusText,
                urlToken: urlToken.substring(0, 5) + '...', // Show partial token for debugging
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: officesResponse.status,
              },
            )
          }

          const officesData = await officesResponse.json()
          const offices = officesData.offices || []

          // Extract all Job IDs
          const availableJobIds: number[] = []
          const jobDetails: Array<{
            department: string
            id: number
            office: string
            title: string
          }> = []

          for (const office of offices) {
            if (office.departments) {
              for (const department of office.departments) {
                if (department.jobs) {
                  for (const job of department.jobs) {
                    availableJobIds.push(job.id)
                    jobDetails.push({
                      id: job.id,
                      department: department.name,
                      office: office.name,
                      title: job.title,
                    })
                  }
                }
              }
            }
          }

          return new Response(
            JSON.stringify({
              availableJobIds: availableJobIds.sort((a, b) => a - b),
              jobDetails: jobDetails.sort((a, b) => a.id - b.id),
              sampleJobIds: availableJobIds.slice(0, 5),
              success: true,
              totalJobs: availableJobIds.length,
              urlToken: urlToken.substring(0, 5) + '...',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return new Response(
            JSON.stringify({
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 500,
            },
          )
        }
      },
      method: 'get',
      path: '/greenhouse/debug',
    })

    if (!config.admin) {
      config.admin = {}
    }

    if (!config.admin.components) {
      config.admin.components = {}
    }

    if (!config.admin.components.beforeDashboard) {
      config.admin.components.beforeDashboard = []
    }

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Ensure we are executing any existing onInit functions before running our own.
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      // No auto-sync - jobs are manually managed
    }

    return config
  }
