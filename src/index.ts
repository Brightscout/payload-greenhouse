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
   * Labels for various elements in the job board
   */
  labels?: {
    applyNow?: string
    applyNowCancel?: string
    back?: string
    department?: string
    description?: string
    hideFullDesc?: string
    location?: string
    office?: string
    readFullDesc?: string
  }
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

    // Plugin configuration with defaults
    const options = {
      apiKey: pluginOptions.apiKey || '',
      boardType: pluginOptions.boardType || 'accordion',
      cacheExpiryTime: pluginOptions.cacheExpiryTime || 3600,
      cycleFx: pluginOptions.cycleFx || 'fade',
      debug: pluginOptions.debug || false,
      formType: pluginOptions.formType || 'iframe',
      labels: {
        applyNow: pluginOptions.labels?.applyNow || 'Apply Now',
        applyNowCancel: pluginOptions.labels?.applyNowCancel || 'Cancel',
        back: pluginOptions.labels?.back || 'Back',
        department: pluginOptions.labels?.department || 'Department: ',
        description: pluginOptions.labels?.description || '',
        hideFullDesc: pluginOptions.labels?.hideFullDesc || 'Hide Full Description',
        location: pluginOptions.labels?.location || 'Location: ',
        office: pluginOptions.labels?.office || 'Office: ',
        readFullDesc: pluginOptions.labels?.readFullDesc || 'Read Full Description',
      },
      urlToken: pluginOptions.urlToken || '',
    }

    if (!config.collections) {
      config.collections = []
    }

    // Create Greenhouse settings collection
    config.collections.push({
      slug: 'greenhouse-settings',
      admin: {
        components: {
          beforeList: ['payload-hubspot/rsc#BeforeDashboardServer'],
        },
        description: 'Configure your Greenhouse job board integration',
        group: 'Integrations',
        useAsTitle: 'name',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          defaultValue: 'Greenhouse Settings',
          required: true,
        },
        {
          name: 'urlToken',
          type: 'text',
          admin: {
            description:
              'Your Greenhouse URL token. Find this in your Greenhouse account under Configure > Dev Center > Configuring your Job Board.',
          },
          required: true,
        },
        {
          name: 'apiKey',
          type: 'text',
          admin: {
            description:
              'Your Greenhouse API key. Required for inline forms. Find this in your Greenhouse account under Configure > Dev Center > Credentials.',
          },
        },
        {
          name: 'boardType',
          type: 'select',
          admin: {
            description: 'The type of job board to display',
          },
          defaultValue: 'accordion',
          options: [
            { label: 'Accordion', value: 'accordion' },
            { label: 'Cycle', value: 'cycle' },
          ],
        },
        {
          name: 'formType',
          type: 'select',
          admin: {
            description: 'The type of application form to use',
          },
          defaultValue: 'iframe',
          options: [
            { label: 'iFrame', value: 'iframe' },
            { label: 'Inline', value: 'inline' },
          ],
        },
        {
          name: 'cycleFx',
          type: 'select',
          admin: {
            condition: (data) => data.boardType === 'cycle',
            description: 'Transition effect for cycle view',
          },
          defaultValue: 'fade',
          options: [
            { label: 'Fade', value: 'fade' },
            { label: 'Fade Out', value: 'fadeout' },
            { label: 'Scroll Horizontally', value: 'scrollHorz' },
            { label: 'None', value: 'none' },
          ],
        },
        {
          name: 'cacheExpiryTime',
          type: 'number',
          admin: {
            description: 'Cache expiration time in seconds. Set to 0 to disable caching.',
          },
          defaultValue: 3600,
        },
        {
          name: 'debug',
          type: 'checkbox',
          admin: {
            description: 'Enable debug mode',
          },
          defaultValue: false,
        },
        {
          name: 'labels',
          type: 'group',
          admin: {
            description: 'Customize text labels',
          },
          fields: [
            {
              name: 'back',
              type: 'text',
              defaultValue: 'Back',
            },
            {
              name: 'applyNow',
              type: 'text',
              defaultValue: 'Apply Now',
            },
            {
              name: 'applyNowCancel',
              type: 'text',
              defaultValue: 'Cancel',
            },
            {
              name: 'readFullDesc',
              type: 'text',
              defaultValue: 'Read Full Description',
            },
            {
              name: 'hideFullDesc',
              type: 'text',
              defaultValue: 'Hide Full Description',
            },
            {
              name: 'location',
              type: 'text',
              defaultValue: 'Location: ',
            },
            {
              name: 'office',
              type: 'text',
              defaultValue: 'Office: ',
            },
            {
              name: 'department',
              type: 'text',
              defaultValue: 'Department: ',
            },
            {
              name: 'description',
              type: 'text',
              defaultValue: '',
            },
          ],
        },
        {
          name: 'customCSS',
          type: 'textarea',
          admin: {
            description: 'Custom CSS for the job board',
          },
        },
      ],
    })

    // Create Greenhouse jobs collection for cache
    config.collections.push({
      slug: 'greenhouse-jobs',
      admin: {
        defaultColumns: ['title', 'department', 'office', 'location', 'updatedAt'],
        group: 'Integrations',
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'jobId',
          type: 'number',
          index: true,
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'richText',
        },
        {
          name: 'department',
          type: 'text',
        },
        {
          name: 'departmentId',
          type: 'number',
        },
        {
          name: 'office',
          type: 'text',
        },
        {
          name: 'officeId',
          type: 'number',
        },
        {
          name: 'location',
          type: 'text',
        },
        {
          name: 'questions',
          type: 'json',
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
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

    if (!pluginOptions.disableDashboard) {
      config.admin.components.beforeDashboard.push('payload-hubspot/rsc#BeforeDashboardServer')
    }

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Ensure we are executing any existing onInit functions before running our own.
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      // Initialize settings if not already present
      const settingsQuery = await payload.find({
        collection: 'greenhouse-settings',
        limit: 1,
      })

      if (settingsQuery.totalDocs === 0) {
        await payload.create({
          collection: 'greenhouse-settings',
          data: {
            name: 'Greenhouse Settings',
            apiKey: options.apiKey,
            boardType: options.boardType,
            cacheExpiryTime: options.cacheExpiryTime,
            cycleFx: options.cycleFx,
            debug: options.debug,
            formType: options.formType,
            labels: options.labels,
            urlToken: options.urlToken,
          },
        })
      }

      // Try to fetch and cache jobs on init if URL token is available
      try {
        const settings = settingsQuery.docs[0]
        if (settings?.urlToken) {
          const urlToken = settings.urlToken
          const response = await fetch(`https://api.greenhouse.io/v1/boards/${urlToken}/jobs`)

          if (!response.ok) {
            console.warn('Failed to fetch Greenhouse jobs on init')
            return
          }

          const greenhouseData = await response.json()
          const jobs = greenhouseData.jobs || []

          // Clear existing cache
          const cachedJobsQuery = await payload.find({
            collection: 'greenhouse-jobs',
            limit: 1000,
          })

          if (cachedJobsQuery.docs.length > 0) {
            for (const job of cachedJobsQuery.docs) {
              await payload.delete({
                id: job.id,
                collection: 'greenhouse-jobs',
              })
            }
          }

          // Store jobs in collection
          for (const job of jobs) {
            // Fetch detailed job info including questions
            const jobDetailsResponse = await fetch(
              `https://api.greenhouse.io/v1/boards/${urlToken}/jobs/${job.id}`,
            )
            const jobDetails = await jobDetailsResponse.json()

            await payload.create({
              collection: 'greenhouse-jobs',
              data: {
                slug: job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                content: job.content,
                department: job.departments?.[0]?.name || '',
                departmentId: job.departments?.[0]?.id || null,
                jobId: job.id,
                location: job.location?.name || '',
                office: job.offices?.[0]?.name || '',
                officeId: job.offices?.[0]?.id || null,
                questions: jobDetails.questions || [],
                title: job.title,
              },
            })
          }
        }
      } catch (error) {
        console.error('Error syncing Greenhouse jobs:', error)
      }
    }

    return config
  }
