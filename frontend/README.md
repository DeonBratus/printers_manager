# 3D Printer Management Frontend

A modern React frontend for managing 3D printers, print jobs, and 

## Features

- **Dashboard**: View real-time status of all printers and active print jobs
- **Printers Management**: Add, view, and manage your 3D printers
- **Print Jobs**: Schedule, monitor, and control print jobs
- **Models**: Manage your 3D models and their print settings
- **Reports**: View statistics and efficiency reports for your printers

## Technology Stack

- React.js with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Axios for API requests
- Chart.js for data visualization

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Backend server running (FastAPI backend)

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm start
# or
yarn start
```

3. Build for production:

```bash
npm run build
# or
yarn build
```

## Environment Variables

Create a `.env` file in the root of the frontend directory with the following variables:

```
REACT_APP_API_URL=http://localhost:8000
```

## API Communication

The frontend communicates with the FastAPI backend using RESTful API calls. The endpoints include:

- `/printers` - Manage 3D printers
- `/models` - Manage 3D models
- `/printings` - Manage print jobs
- `/reports` - Get statistics and reports

## Project Structure

```
frontend/
├── public/            # Static files
├── src/               # Source code
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page components
│   ├── services/      # API services
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main App component
│   └── index.tsx      # Application entry point
├── package.json       # Dependencies and scripts
└── tailwind.config.js # Tailwind CSS configuration
``` 