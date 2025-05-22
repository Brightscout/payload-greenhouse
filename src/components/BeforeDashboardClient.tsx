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

type BeforeDashboardClientProps = {
  jobs: GreenhouseJob[]
}

export const BeforeDashboardClient = ({ jobs: initialJobs }: BeforeDashboardClientProps) => {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [jobs, setJobs] = useState<GreenhouseJob[]>(initialJobs || [])

  if (!jobs || !Array.isArray(jobs)) {
    return <div>No Greenhouse jobs available</div>
  }

  // Count unique departments and locations
  const departments = new Set(jobs.map((job) => job.department).filter(Boolean))
  const locations = new Set(jobs.map((job) => job.location).filter(Boolean))
  const offices = new Set(jobs.map((job) => job.office).filter(Boolean))

  const refreshCache = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/greenhouse/clear-cache', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to clear cache')
      }

      // Fetch updated jobs
      const jobsResponse = await fetch('/api/greenhouse/jobs?refresh=true')

      if (!jobsResponse.ok) {
        throw new Error('Failed to fetch updated jobs')
      }

      const updatedJobs = await jobsResponse.json()
      setJobs(updatedJobs)
    } catch (error) {
      console.error('Error refreshing cache:', error)
    } finally {
      setRefreshing(false)
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
      <div className={styles.greenhouseDashboardHeader}>
        <h1>Greenhouse Job Board</h1>
        <button
          className={styles.refreshButton}
          disabled={refreshing}
          onClick={refreshCache}
          type="button"
        >
          {refreshing ? 'Refreshing...' : 'Refresh Job Cache'}
        </button>
      </div>

      <div className={styles.greenhouseDashboardStats}>
        <div className={styles.statCard}>
          <h3>Total Jobs</h3>
          <p>{jobs.length}</p>
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

      <div className={styles.greenhouseDashboardRecent}>
        <h3>Recent Jobs</h3>
        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Department</th>
                <th>Location</th>
                <th>Office</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 10).map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>{job.department || '-'}</td>
                  <td>{job.location || '-'}</td>
                  <td>{job.office || '-'}</td>
                  <td>{new Date(job.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.greenhouseHelp}>
        <h3>How to Use</h3>
        <p>
          This plugin connects your Payload CMS with Greenhouse Applicant Tracking System. The job
          board can be displayed on your website using the Greenhouse Job Board component.
        </p>
        <p>
          <strong>Key Features:</strong>
        </p>
        <ul>
          <li>Auto-sync jobs from Greenhouse</li>
          <li>Display jobs in accordion or cycle layout</li>
          <li>Support for both iframe and inline application forms</li>
          <li>Customizable labels and styling</li>
        </ul>
      </div>
    </div>
  )
}

export default BeforeDashboardClient
