'use client'

import React, { useState } from 'react'

import styles from './BeforeDashboardClient.module.css'

type GreenhouseJob = {
  department: string
  id: string
  location: string
  office: string
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
  console.log('initialJobs', initialJobs)
  const [loading, setLoading] = useState(false)

  if (!initialJobs || !Array.isArray(initialJobs)) {
    return <div>No Greenhouse jobs available</div>
  }

  // Calculate statistics using initialJobs
  const departments = new Set(initialJobs.map((job) => job.department).filter(Boolean))
  const locations = new Set(initialJobs.map((job) => job.location).filter(Boolean))
  const offices = new Set(initialJobs.map((job) => job.office).filter(Boolean))

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
    </div>
  )
}

export default BeforeDashboardClient
