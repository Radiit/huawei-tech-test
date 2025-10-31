# Huawei Employee Management System

🚀 Demo: [huawei-tech-test.surge.sh](http://huawei-tech-test.surge.sh)

📝 API Docs: [Postman Documentation](https://documenter.getpostman.com/view/39299483/2sB3HnKf8f)

## Tech Stack

<p align="left">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express.js-API-000000?logo=express&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Storage-3ECF8E?logo=supabase&logoColor=white" />
  <img alt="Render" src="https://img.shields.io/badge/Render-Hosting-46E3B7?logo=render&logoColor=black" />
  <img alt="Surge" src="https://img.shields.io/badge/Surge-Frontend-000000?logo=surge&logoColor=white" />
  <img alt="GitHub Actions" src="https://img.shields.io/badge/GitHub%20Actions-CI/CD-2088FF?logo=githubactions&logoColor=white" />
</p>

## Features

### 1. Backend
- Express.js REST API, JWT auth, RBAC middleware
- Prisma ORM to Supabase Postgres (pgBouncer-ready)
- CORS with allowlist, Helmet, Compression, Rate limiting

### 2. Automation (pg_cron)
- Jobs: 08:00, 12:00, 15:00 WIB data collection; 02:00 WIB cleanup (DB)
- Custom cron via RPC wrappers (`public.cron_schedule`, etc.)
- Export latest collection to Supabase Storage as CSV (multi-row)
- Status and run history via RPC list functions

### 3. Data Processing
- SQL scripts answering the assignment (insert/update/aggregate/subquery)
- Equivalent Prisma implementations for API usage

## Project Structure

```
huawei/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/         # SQL + Prisma scripts, cron helpers
│   ├── services/        # prismaAuthService, supabaseCronService, storage
│   └── utils/
├── prisma/
├── fe/                  # standalone frontend (Surge)
├── logs/
├── cron-data/
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)
- Supabase project (URL + keys), Render account (optional)

## Setup & Run

### Local (no Docker)

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

### Single Docker container

1. Build
   ```bash
   docker build -t huawei-api .
   docker run -p 3000:3000 --env-file .env huawei-api
   ```

2. View logs
   ```bash
   docker logs -f <container-id>
   ```

### Docker Compose (optional)
1. Up
   ```bash
   docker-compose up -d
   ```
2. Down
   ```bash
   docker-compose down
   ```

## API Endpoints (high-level)

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | Get all employees with filtering |
| GET | `/api/employees/:id` | Get employee by ID |
| POST | `/api/employees` | Create new employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |

### Analytics

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

## Automation & Cron

### Cron management via API (pg_cron wrappers)
Use the Postman docs or collection in repo (`postman_collection.json`):
- Initialize (create functions + setup jobs)
- Create custom cron (jobName, schedule, command)
- List jobs, Status, Test by name, Delete
- Export latest to Storage (CSV)
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

## Cron Jobs

The application uses Postgres `pg_cron` on Supabase:

- Data Collection: 08:00, 12:00, 15:00 WIB daily (writes `data_collections`)
- Data Cleanup (DB): 02:00 WIB daily (deletes rows older than 30 days)
- Storage cleanup: implement separately if you also want to delete old files

## Database Schema (Prisma logical model)

### Employees Table
Columns: `id, name, position, joinDate, releaseDate, yearsOfExperience, salary, createdAt, updatedAt`.

### Data Collections Table
Columns: `id, collection_date, collection_time, data_source, data_content, file_path, created_at`.

RBAC models: `users, roles, permissions, user_roles, role_permissions`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `DATABASE_URL` | Supabase pooled URL | required |
| `DIRECT_URL` | Supabase direct URL (migrations) | required |
| `SUPABASE_URL` | Supabase URL | required |
| `SUPABASE_ANON_KEY` | Supabase anon key | required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | required |
| `CRON_DATA_PATH` | Local cron dir (optional) | `./cron-data` |
| `DATA_SOURCE_URL` | External data source | `https://jsonplaceholder.typicode.com/posts` |
| `JWT_SECRET` | JWT secret | required |
| `LOG_LEVEL` | Logging level | `info` |

## Seeded Accounts & Permissions

Demo accounts (also shown on the demo UI):

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@huawei.com | Admin123!@# |
| HR_MANAGER | hr.manager@huawei.com | HR123!@# |
| MANAGER | manager@huawei.com | Manager123!@# |
| EMPLOYEE | employee@huawei.com | Employee123!@# |
| GUEST | guest@huawei.com | Guest123!@# |

Permissions:
- ADMIN: superadmin (memiliki seluruh permissions, termasuk `system:MANAGE`)
- Lainnya: permissions sesuai kebutuhan CRUD employees dan akses laporan

RBAC endpoints tersedia di collection Postman dan digunakan oleh FE untuk matrix izin.

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

## Deployment

- Render: Docker web service, `trust proxy` enabled, Prisma configured for pgBouncer
- Frontend: Surge (`fe/`), set `window.__API_BASE__` to backend base URL
- CI/CD: GitHub Actions used for earlier flow; Render handles deploys now

## Monitoring

- **Health Check**: `GET /health`
- **Logs**: Check `./logs/app.log`
- **Docker Logs**: `docker-compose logs -f` or `docker logs -f <id>`

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

3. **Cron data directory not found (local)**
   ```bash
   # Create directory
   mkdir -p /home/cron
   chmod 755 /home/cron
   ```
