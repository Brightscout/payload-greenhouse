# PayloadCMS Greenhouse Plugin

A comprehensive PayloadCMS plugin that integrates with Greenhouse ATS (Applicant Tracking System) to manage job listings directly within your Payload admin dashboard.

![Plugin Version](https://img.shields.io/badge/version-1.0.0-blue)
![PayloadCMS](https://img.shields.io/badge/PayloadCMS-3.29.0+-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Features

### Core Functionality

- **Job Management**: View and manage Greenhouse job listings directly in Payload admin
- **Real-time Sync**: Fetch job data from Greenhouse API with automatic validation
- **Dashboard Widget**: Beautiful dashboard interface showing job statistics and quick actions
- **Debug Tools**: Built-in debugging endpoints for troubleshooting API connections

### Job Board Integration

- **Multiple Display Types**: Support for accordion and cycle view layouts
- **Customizable Forms**: Support for both iframe and inline application forms
- **Department Organization**: Jobs organized by offices and departments
- **Location Filtering**: Filter jobs by location and office

### Developer Features

- **TypeScript Support**: Full TypeScript definitions included
- **Caching System**: Configurable cache expiration for optimal performance
- **Error Handling**: Comprehensive error handling and logging
- **Flexible Configuration**: Multiple configuration options for different use cases

## 📦 Installation

```bash
npm install payload-greenhouse
# or
yarn add payload-greenhouse
# or
pnpm add payload-greenhouse
```

## ⚙️ Configuration

### 1. Environment Variables

Set up your environment variables in `.env`:

```env
GREENHOUSE_URL_TOKEN=your_greenhouse_url_token
GREENHOUSE_API_KEY=your_greenhouse_api_key  # Optional, required for inline forms
```

### 2. Basic Plugin Setup

Add the plugin to your Payload configuration:

```typescript
// payload.config.ts
import { buildConfig } from 'payload'
import { payloadGreenhouse } from 'payload-greenhouse'

export default buildConfig({
  // ... your other config
  plugins: [
    payloadGreenhouse({
      urlToken: process.env.GREENHOUSE_URL_TOKEN,
      apiKey: process.env.GREENHOUSE_API_KEY, // Optional
    }),
  ],
})
```

### 3. Advanced Configuration

```typescript
payloadGreenhouse({
  // Required: Your Greenhouse URL token
  urlToken: process.env.GREENHOUSE_URL_TOKEN,

  // Optional: API key for inline application forms
  apiKey: process.env.GREENHOUSE_API_KEY,

  // Board display type: 'accordion' or 'cycle'
  boardType: 'accordion',

  // Form integration type: 'iframe' or 'inline'
  formType: 'iframe',

  // Cache expiration time in seconds (default: 3600 = 1 hour)
  cacheExpiryTime: 3600,

  // Transition effect for cycle view
  cycleFx: 'fade', // 'fade' | 'fadeout' | 'none' | 'scrollHorz'

  // Enable debug mode for additional logging
  debug: true,

  // Disable the plugin entirely
  disabled: false,

  // Disable the dashboard widget
  disableDashboard: false,

  // Add Greenhouse job board to specific collections
  collections: {
    posts: true,
    pages: true,
  },
})
```

## 🛠️ Usage

### Managing Jobs

1. **Navigate to Admin Dashboard**: Open your Payload admin panel
2. **Greenhouse Jobs Section**: Find the "Greenhouse Jobs" collection under "Integrations"
3. **Add New Job**: Click "Create New" and enter a valid Greenhouse Job ID
4. **Auto-sync**: Job details will be automatically fetched and populated from Greenhouse

### Job Collection Fields

When you add a job, the following fields are automatically populated:

| Field           | Description             | Source                 |
| --------------- | ----------------------- | ---------------------- |
| `jobId`         | Greenhouse Job ID       | User input (validated) |
| `title`         | Job title               | Greenhouse API         |
| `location`      | Job location            | Greenhouse API         |
| `department`    | Department name         | Greenhouse API         |
| `office`        | Office location         | Greenhouse API         |
| `publishedDate` | Publication date        | Greenhouse API         |
| `updatedAt`     | Last update timestamp   | Auto-generated         |
| `absoluteUrl`   | Direct application link | Greenhouse API         |
| `content`       | Job description         | Greenhouse API         |
| `companyName`   | Company name            | Greenhouse API         |
| `requisitionId` | Internal requisition ID | Greenhouse API         |
| `internalJobId` | Internal job identifier | Greenhouse API         |

### Dashboard Widget

The plugin adds a dashboard widget that displays:

- Total number of available jobs
- Quick statistics by department and office
- Recent job updates
- Quick access to add new jobs
- Debug information (when enabled)

### API Endpoints

The plugin exposes several API endpoints:

#### GET `/api/greenhouse/jobs`

Fetch all available jobs from Greenhouse

```javascript
// Example response
;[
  {
    id: 12345,
    title: 'Senior Software Engineer',
    department: 'Engineering',
    office: 'San Francisco',
    location: 'San Francisco, CA',
    absoluteUrl: 'https://boards.greenhouse.io/company/jobs/12345',
    updatedAt: '2024-01-15T10:30:00Z',
  },
]
```

#### POST `/api/greenhouse/apply`

Submit job applications (requires API key)

#### POST `/api/greenhouse/clear-cache`

Clear the job cache

#### GET `/api/greenhouse/debug`

Debug endpoint for troubleshooting API connections

```javascript
// Example response
{
  "success": true,
  "totalJobs": 25,
  "availableJobIds": [12345, 12346, 12347],
  "jobDetails": [
    {
      "id": 12345,
      "title": "Senior Software Engineer",
      "department": "Engineering",
      "office": "San Francisco"
    }
  ]
}
```

## 🏗️ Adding to Collections

You can add Greenhouse job board functionality to existing collections:

```typescript
payloadGreenhouse({
  collections: {
    posts: true, // Add to posts collection
    pages: true, // Add to pages collection
    projects: true, // Add to projects collection
  },
})
```

This adds a `greenhouseJobBoard` field group to the specified collections with options to:

- Enable/disable job board for individual documents
- Override the default board type per document

## 🔧 Development

### Project Structure

```
src/
├── index.ts                 # Main plugin configuration
├── components/              # React components
│   ├── BeforeDashboardServer.tsx   # Server-side dashboard component
│   ├── BeforeDashboardClient.tsx   # Client-side dashboard component
│   └── BeforeDashboardClient.module.css  # Styles
├── utils/                   # Utility functions
│   └── greenhouseApi.ts     # Greenhouse API integration
└── exports/                 # Export definitions
    ├── client.ts           # Client-side exports
    └── rsc.ts              # React Server Components exports
```

### Building the Plugin

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Development mode
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Testing

The plugin includes comprehensive tests:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test integration.test.ts
```

## 🐛 Troubleshooting

### Common Issues

#### "URL token not configured"

- Ensure `GREENHOUSE_URL_TOKEN` environment variable is set
- Verify the token is valid in the Greenhouse dashboard

#### "Job ID not found"

- Use the `/api/greenhouse/debug` endpoint to see available job IDs
- Ensure the job is published and active in Greenhouse

#### "Unauthorized access to Greenhouse API"

- Check that your URL token has proper permissions
- For inline forms, ensure `GREENHOUSE_API_KEY` is set correctly

### Debug Mode

Enable debug mode for additional logging:

```typescript
payloadGreenhouse({
  debug: true,
  // ... other options
})
```

### API Connection Testing

Test your Greenhouse connection:

```bash
curl http://localhost:3000/api/greenhouse/debug
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/payload-greenhouse.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`
5. Make your changes and add tests
6. Run tests: `pnpm test`
7. Submit a pull request

## 📞 Support

- **GitHub Issues**: [Create an issue](https://github.com/Brightscout/payload-greenhouse/issues)
- **Documentation**: Check this README and inline code comments
- **Community**: Join the PayloadCMS Discord community

## 🔗 Related Links

- [PayloadCMS Documentation](https://payloadcms.com/docs)
- [Greenhouse API Documentation](https://developers.greenhouse.io/job-board.html)
- [Plugin Development Guide](https://payloadcms.com/docs/plugins/overview)
