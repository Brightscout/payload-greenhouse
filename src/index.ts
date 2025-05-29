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
          type: 'number',
          admin: {
            readOnly: true,
          },
          label: 'Job ID',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          admin: {
            readOnly: true,
          },
          label: 'Job Title',
          required: true,
        },
        {
          name: 'location',
          type: 'text',
          admin: {
            readOnly: true,
          },
          label: 'Location',
        },
        {
          name: 'department',
          type: 'text',
          admin: {
            readOnly: true,
          },
          label: 'Department',
        },
        {
          name: 'office',
          type: 'text',
          admin: {
            readOnly: true,
          },
          label: 'Office',
        },
        {
          name: 'publishedDate',
          type: 'date',
          admin: {
            readOnly: true,
          },
          label: 'Published Date',
        },
        {
          name: 'updatedAt',
          type: 'date',
          admin: {
            readOnly: true,
          },
          label: 'Last Updated',
        },
        {
          name: 'absoluteUrl',
          type: 'text',
          admin: {
            readOnly: true,
          },
          label: 'Application URL',
        },
        {
          name: 'content',
          type: 'textarea',
          admin: {
            readOnly: true,
          },
          label: 'Job Description',
        },
        {
          name: 'companyName',
          type: 'text',
          admin: {
            readOnly: true,
          },
          label: 'Company Name',
        },
        {
          name: 'requisitionId',
          type: 'text',
          admin: {
            readOnly: true,
          },
          label: 'Requisition ID',
        },
        {
          name: 'internalJobId',
          type: 'number',
          admin: {
            readOnly: true,
          },
          label: 'Internal Job ID',
        },
      ],
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

      // Initialize and sync jobs
      try {
        // Use plugin options for URL token and API key
        const urlToken = pluginOptions.urlToken || process.env.GREENHOUSE_URL_TOKEN

        if (urlToken) {
          // Fetch offices (which contain departments and jobs)
          const officesResponse = await fetch(
            `https://boards-api.greenhouse.io/v1/boards/${urlToken}/offices`,
          )

          if (!officesResponse.ok) {
            console.warn('Failed to fetch Greenhouse offices on init')
            return
          }

          const officesData = await officesResponse.json()
          const offices = officesData.offices || []

          // Extract all jobs from all offices and departments
          const allJobs: Array<{ department: any; job: any; office: any }> = []
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

          // Clear existing jobs and create new ones
          const existingJobs = await payload.find({
            collection: 'greenhouse-jobs',
            limit: 1000,
          })

          // Delete existing jobs
          for (const existingJob of existingJobs.docs) {
            await payload.delete({
              id: existingJob.id,
              collection: 'greenhouse-jobs',
            })
          }

          console.log('allJobs', allJobs)

          // Create new job documents with detailed information
          for (const { department, job, office } of allJobs) {
            // Fetch detailed job info including content and questions
            let jobDetails: any = {}
            try {
              const jobDetailsResponse = await fetch(
                `https://boards-api.greenhouse.io/v1/boards/${urlToken}/jobs/${job.id}`,
              )
              if (jobDetailsResponse.ok) {
                jobDetails = await jobDetailsResponse.json()
              }
            } catch (error) {
              console.warn(`Failed to fetch details for job ${job.id}:`, error)
            }

            await payload.create({
              collection: 'greenhouse-jobs',
              data: {
                absoluteUrl: job.absolute_url,
                companyName: job.company_name,
                content: jobDetails.content || job.content || '',
                department: department.name,
                internalJobId: job.internal_job_id,
                jobId: job.id,
                location: job.location?.name || '',
                office: office.name,
                publishedDate: job.first_published ? new Date(job.first_published) : null,
                requisitionId: job.requisition_id,
                title: job.title,
                updatedAt: job.updated_at ? new Date(job.updated_at) : null,
              },
            })
          }

          console.log(`Synced ${allJobs.length} jobs from Greenhouse`)
        }
      } catch (error) {
        console.error('Error syncing Greenhouse jobs:', error)
      }
    }

    return config
  }
