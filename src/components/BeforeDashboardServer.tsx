import type { PayloadRequest } from 'payload'

import { getPluginOptions } from '../index.js'
import { greenhouseJobsHandler } from '../utils/greenhouseApi.js'

export const BeforeDashboardServer = async () => {
  const pluginOptions = getPluginOptions()

  if (!pluginOptions) {
    console.error('Plugin options not available')
    return <div>Greenhouse integration not properly configured</div>
  }

  try {
    const response = await greenhouseJobsHandler({ query: {} } as PayloadRequest, pluginOptions)
    const jobs = await response.json()

    // Get settings from response or use defaults
    const settings = {
      apiKey: pluginOptions.apiKey ? '✅ Configured' : '❌ Missing',
      boardType: pluginOptions.boardType || 'accordion',
      formType: pluginOptions.formType || 'iframe',
      urlToken: pluginOptions.urlToken || '',
    }

    return (
      <div className="greenhouse-admin-container">
        <h1>Greenhouse Job Board</h1>

        <div className="greenhouse-admin-status">
          <div className="greenhouse-admin-status-item">
            <strong>URL Token:</strong> {settings.urlToken ? '✅ Configured' : '❌ Missing'}
          </div>
          <div className="greenhouse-admin-status-item">
            <strong>API Key:</strong> {settings.apiKey}
          </div>
          <div className="greenhouse-admin-status-item">
            <strong>Jobs Cached:</strong> {jobs.length || 0}
          </div>
          <div className="greenhouse-admin-status-item">
            <strong>Board Type:</strong> {settings.boardType}
          </div>
        </div>

        {jobs.length > 0 ? (
          <div className="greenhouse-admin-recent">
            <h3>Recent Jobs</h3>
            <table className="greenhouse-admin-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).map((job: any) => (
                  <tr key={job.id}>
                    <td>{job.title}</td>
                    <td>{job.department || '-'}</td>
                    <td>{job.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="greenhouse-admin-empty">
            No jobs found. Please check your Greenhouse configuration or refresh the cache.
          </div>
        )}
      </div>
    )
  } catch (err) {
    console.error('Error fetching Greenhouse jobs:', err)
    return <div>Failed to load Greenhouse jobs</div>
  }
}
