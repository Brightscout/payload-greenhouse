'use client'

import React, { useState } from 'react'

import styles from './BeforeDashboardClient.module.css'

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

type BeforeDashboardClientProps = {
  jobs: GreenhouseJob[]
  settings?: GreenhouseSettings
}

export const BeforeDashboardClient = ({
  jobs: initialJobs,
  settings,
}: BeforeDashboardClientProps) => {
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<null | string>(null)

  if (!initialJobs || !Array.isArray(initialJobs)) {
    return <div>No Greenhouse jobs available</div>
  }

  // Calculate statistics using initialJobs
  const departments = new Set(initialJobs.map((job) => job.department).filter(Boolean))
  const locations = new Set(initialJobs.map((job) => job.location).filter(Boolean))
  const offices = new Set(initialJobs.map((job) => job.office).filter(Boolean))

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const refreshJobs = async () => {
    try {
      setLoading(true)

      // Clear cache first
      const clearResponse = await fetch('/api/greenhouse/clear-cache', { method: 'POST' })
      if (!clearResponse.ok) {
        throw new Error('Failed to clear cache')
      }

      // Trigger a fresh sync by calling the jobs endpoint
      const syncResponse = await fetch('/api/greenhouse/jobs?refresh=true')
      if (!syncResponse.ok) {
        throw new Error('Failed to sync jobs')
      }

      // Reload the page to show updated data since we're fetching from collection
      window.location.reload()
    } catch (error) {
      console.error('Error refreshing jobs:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.greenhouseDashboard}>
        <div className={styles.loadingSpinner} />
        Loading Greenhouse dashboard...
      </div>
    )
  }

  return (
    <div className="gutter--left gutter--right collection-list__wrap">
      {/* Configuration Status */}
      <div className={styles.greenhouseDashboardHeader}>
        <h1>Greenhouse Job Board Dashboard</h1>
        <button
          className={styles.refreshButton}
          disabled={loading}
          onClick={refreshJobs}
          type="button"
        >
          {loading ? 'Refreshing...' : 'Refresh Jobs'}
        </button>
      </div>

      {/* Configuration Status Alert */}
      {(!settings?.urlToken || !settings?.apiKey) && (
        <div className={styles.errorMessage}>
          <h3>
            <span aria-label="Warning" role="img">
              ⚠️
            </span>{' '}
            Configuration Required
          </h3>
          <p>
            Please configure your Greenhouse settings via environment variables to enable full
            functionality.
            {!settings?.urlToken && ' GREENHOUSE_URL_TOKEN is required.'}
            {!settings?.apiKey && ' GREENHOUSE_API_KEY is required for inline forms.'}
          </p>
        </div>
      )}

      {/* Job Statistics */}
      <div className={styles.greenhouseDashboardStats}>
        <div className={styles.statCard}>
          <h3>Total Jobs</h3>
          <p>{initialJobs.length}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Departments</h3>
          <p>{departments.size}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Locations</h3>
          <p>{locations.size}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Offices</h3>
          <p>{offices.size}</p>
        </div>
      </div>

      {/* All Available Jobs Table */}
      <div className={styles.greenhouseDashboardRecent}>
        <h3>All Available Jobs</h3>
        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Job ID</th>
                <th>Department</th>
                <th>Location</th>
                <th>Office</th>
                <th>Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {initialJobs
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.title}</strong>
                      {job.absoluteUrl && (
                        <div
                          style={{
                            color: 'var(--theme-elevation-500)',
                            fontSize: '0.75rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          <a
                            href={job.absoluteUrl}
                            rel="noopener noreferrer"
                            style={{ color: 'var(--theme-elevation-500)', textDecoration: 'none' }}
                            target="_blank"
                          >
                            View Application →
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.copyContainer}>
                        {job.jobId || job.id}
                        <button
                          className={styles.copyButton}
                          onClick={() => copyToClipboard(String(job.jobId || job.id))}
                          title="Copy to clipboard"
                          type="button"
                        >
                          {copiedId === String(job.jobId || job.id) ? (
                            <svg
                              fill="none"
                              height="16"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              width="16"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : (
                            <svg
                              fill="none"
                              height="16"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              width="16"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <rect height="13" rx="2" ry="2" width="13" x="9" y="9"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>{job.department}</td>
                    <td>{job.location}</td>
                    <td>{job.office}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          job.status === 'active'
                            ? styles.active
                            : job.status === 'draft'
                              ? styles.draft
                              : job.status === 'closed'
                                ? styles.closed
                                : job.status === 'on-hold'
                                  ? styles.onHold
                                  : styles.active
                        }`}
                      >
                        {job.status === 'on-hold'
                          ? 'On Hold'
                          : job.status
                            ? job.status.charAt(0).toUpperCase() + job.status.slice(1)
                            : 'Active'}
                      </span>
                    </td>
                    <td>{job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default BeforeDashboardClient
