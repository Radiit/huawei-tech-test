# Huawei Employee Management System

A comprehensive Node.js/Express.js application for employee management with automated data collection and processing capabilities.

## Features

### 1. Backend Development
- **RESTful API** built with Express.js
- **Employee Management** with CRUD operations
- **Data Validation** using express-validator
- **SQLite Database** for data persistence
- **Rate Limiting** and security middleware
- **Structured Logging** with Winston
- **Error Handling** with custom middleware

### 2. Automation Testing
- **Local Cron Jobs** for reliable system-level scheduling
- **Data Collection** 3 times daily (08:00, 12:00, 15:00 WIB)
- **JSON Export** with timestamped filenames
- **Data Cleanup** for files older than 30 days
- **Built-in Monitoring** with job status and logging
- **Docker Integration** for containerized environments

### 3. Data Processing
- **SQL Queries** for employee data analysis
- **Salary Calculations** by year
- **Experience-based Sorting**
- **Position-based Filtering**

## Project Structure

```
huawei/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── scripts/         # Cron and utility scripts
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── data/                # SQLite database
├── logs/                # Application logs
├── cron-data/           # Collected data files
├── public/              # Static assets
├── tests/               # Test files
├── docker-compose.yml   # Docker services
├── Dockerfile          # Container configuration
└── package.json        # Dependencies
```

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose (for containerized deployment)
- Git

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd huawei
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env file with your configuration
   ```

4. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Docker Deployment

1. **Build and start services**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f api
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Employee Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | Get all employees with filtering |
| GET | `/api/employees/:id` | Get employee by ID |
| POST | `/api/employees` | Create new employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |

### Data Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/top-experience` | Top employees by experience |
| GET | `/api/employees/engineers/low-experience` | Engineers with ≤3 years experience |
| GET | `/api/employees/position/:position` | Employees by position |
| GET | `/api/employees/salary/year/:year` | Total salary for specific year |
| PATCH | `/api/employees/engineers/salary` | Update engineer salary |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API information |

## Usage Examples

### Create Employee
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "position": "Engineer",
    "join_date": "2024-01-15",
    "experience_years": 2.5,
    "salary": 50000
  }'
```

### Get All Employees
```bash
curl http://localhost:3000/api/employees
```

### Get Top 3 by Experience
```bash
curl http://localhost:3000/api/employees/top-experience?limit=3
```

### Get Total Salary for 2021
```bash
curl http://localhost:3000/api/employees/salary/year/2021
```

## Automation Scripts

### Local Cron Jobs Management
```bash
# Setup all cron jobs
npm run cron:setup

# Test data collection
npm run cron:test

# Check cron status
npm run cron:status

# Manual data collection
npm run cron:collect

# Manual data cleanup
npm run cron:cleanup
```

### Manual Data Operations
```bash
# Manual data collection
npm run cron:collect

# Manual data cleanup
npm run cron:cleanup-old

# Or using Docker
docker-compose run data-collector
docker-compose run data-cleanup
```

### SQL Queries
```bash
# Run all SQL queries from requirement
docker-compose run sql-queries
```

## Cron Jobs

The application uses local cron jobs for reliable scheduling:

- **Data Collection**: 08:00, 12:00, 15:00 WIB daily
- **Data Cleanup**: 02:00 WIB daily (removes files >30 days old)
- **System-level Scheduling**: More reliable than container cron
- **Built-in Monitoring**: Job status and execution logs
- **Easy Management**: Simple setup and monitoring commands

See [CRON_SETUP_GUIDE.md](./CRON_SETUP_GUIDE.md) for detailed setup instructions.

## Database Schema

### Employees Table
```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  join_date TEXT NOT NULL,
  release_date TEXT,
  experience_years REAL NOT NULL,
  salary INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Data Collections Table
```sql
CREATE TABLE data_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_date TEXT NOT NULL,
  collection_time TEXT NOT NULL,
  data_source TEXT NOT NULL,
  data_content TEXT NOT NULL,
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `localhost` |
| `DB_PATH` | Database file path | `./data/employees.db` |
| `CRON_DATA_PATH` | Cron data directory | `/home/cron` |
| `LOG_LEVEL` | Logging level | `info` |

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Code Formatting
```bash
npm run format
```

## Production Deployment

### VPS Setup

1. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

2. **Install Docker Compose**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Clone and Deploy**
   ```bash
   git clone <repository-url>
   cd huawei
   docker-compose up -d
   ```

4. **Set up Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Monitoring

- **Health Check**: `GET /health`
- **Logs**: Check `./logs/app.log`
- **Docker Logs**: `docker-compose logs -f`

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in .env file
   PORT=3001
   ```

2. **Database permission issues**
   ```bash
   # Fix permissions
   chmod 755 data/
   chmod 644 data/employees.db
   ```

3. **Cron data directory not found**
   ```bash
   # Create directory
   mkdir -p /home/cron
   chmod 755 /home/cron
   ```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository.

