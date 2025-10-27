# HOPTranscribe

**Sermon & Reference Assistant v1.0**

A real-time transcription application that detects and displays Bible scripture references during audio recordings. Built with React frontend and .NET backend, powered by OpenAI's Realtime API.

## 🎯 Features

- **Real-time Audio Transcription**: Live speech-to-text using OpenAI's Realtime API
- **Scripture Detection**: Automatically identifies Bible references with confidence scoring
- **Multi-Version Support**: Supports multiple Bible translations (KJV, NIV, ESV, NKJV, NLT, etc.)
- **Configurable Settings**: Adjust confidence thresholds, max references, and display preferences
- **Mobile Responsive**: Works on desktop and mobile devices
- **WebSocket Streaming**: Low-latency real-time communication

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Browser (React + TypeScript)        │
│  - Audio Capture (MediaRecorder)            │
│  - WebSocket Client                         │
│  - Real-time UI Updates                     │
└──────────────┬──────────────────────────────┘
               │
               │ WebSocket (Audio Stream)
               │
┌──────────────▼──────────────────────────────┐
│        Backend API (.NET 9)                 │
│  - Ephemeral Token Management               │
│  - CORS & Security                          │
│  - Health Checks                            │
└──────────────┬──────────────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────────────┐
│        OpenAI Realtime API                  │
│  - Speech-to-Text                           │
│  - Scripture Detection (GPT-4o)             │
│  - Confidence Scoring                       │
└─────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended)
- OR **Node.js 18+** and **.NET 9 SDK** for local development
- **OpenAI API Key** with Realtime API access

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/HOPTranscribe.git
   cd HOPTranscribe
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health/status

5. **View logs**
   ```bash
   docker-compose logs -f
   ```

6. **Stop the application**
   ```bash
   docker-compose down
   ```

### Option 2: Local Development

#### Backend Setup

```bash
cd src/be

# Restore dependencies
dotnet restore

# Add your OpenAI API key to appsettings.Development.json
# {
#   "OpenAI": {
#     "ApiKey": "sk-proj-your-key-here"
#   }
# }

# Run the API
dotnet run
# API available at http://localhost:5000
```

#### Frontend Setup

```bash
cd src/fe

# Install dependencies
npm install

# Start development server
npm run dev
# App available at http://localhost:5173
```

## 📁 Project Structure

```
HOPTranscribe/
├── src/
│   ├── fe/                    # React Frontend
│   │   ├── src/
│   │   │   ├── components/    # UI Components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── services/      # API & WebSocket services
│   │   │   ├── constants/     # Configuration constants
│   │   │   ├── types/         # TypeScript types
│   │   │   └── pages/         # Page components
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── package.json
│   │
│   └── be/                    # .NET Backend
│       ├── Controllers/       # API endpoints
│       ├── Services/          # Business logic
│       ├── Configuration/     # Settings classes
│       ├── Constants/         # API constants
│       ├── Middleware/        # Custom middleware
│       ├── Models/            # Data models
│       ├── Dockerfile
│       └── HOPTranscribe.csproj
│
├── docker-compose.yml         # Multi-container setup
├── .github/
│   └── workflows/            # CI/CD pipelines
├── docs/                     # Documentation
└── README.md
```

## ⚙️ Configuration

### Environment Variables

**Backend (.env or docker-compose.yml):**
```bash
OPENAI_API_KEY=sk-proj-xxx          # Required: OpenAI API key
OpenAI__TimeoutSeconds=30           # Optional: API timeout
OpenAI__Voice=alloy                 # Optional: TTS voice
AllowedOrigins__0=http://localhost:3000  # CORS origins
```

**Frontend:**
```bash
VITE_API_URL=http://localhost:5000  # Backend API URL
```

### Application Settings

Configurable via Settings Panel in the UI:
- **Audio Input Device**: Select microphone
- **Bible Version**: Default translation (NKJV, KJV, NIV, etc.)
- **Minimum Confidence**: Filter references by confidence score (0-100%)
- **Max References**: Number of scripture matches per detection (1-10)
- **Show Confidence**: Toggle confidence badge display
- **Auto-scroll**: Automatically scroll to latest transcription

## 🛠️ Development

### Frontend Technologies
- React 18.2 + TypeScript
- Vite 4.4 (Build tool)
- Tailwind CSS 3.4.13
- shadcn/ui (Radix UI components)
- WebSocket (Native browser API)
- MediaRecorder API

### Backend Technologies
- .NET 9
- ASP.NET Core Web API
- Serilog (Logging)
- OpenAI Realtime API

### Key Features Implementation

**Real-time Audio Processing:**
```typescript
// src/fe/src/hooks/useRealtimeWebSocket.ts
- Captures audio via MediaRecorder
- Streams to OpenAI via WebSocket
- Processes transcription + scripture detection
- Updates UI in real-time
```

**Scripture Detection:**
```csharp
// src/be/Controllers/OpenAIController.cs
- Manages ephemeral token lifecycle
- Proxies OpenAI Realtime API
- Handles session configuration
```

## 📊 API Endpoints

### Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/openai/session` | Create ephemeral token for OpenAI |
| GET | `/health/status` | Health check endpoint |

## 🚢 Deployment

### Multi-Cloud Infrastructure as Code

HOPTranscribe supports deployment to **three major cloud providers** using Terraform:

| Cloud | Service | Scale-to-Zero | Dev Cost | Prod Cost | Best For |
|-------|---------|---------------|----------|-----------|----------|
| **Azure** | Container Apps | ✅ Yes | $15-25 | $50-80 | Balanced cost/features |
| **AWS** | ECS Fargate | ❌ No | $55-65 | $130-155 | Enterprise/complex networking |
| **GCP** | Cloud Run | ✅ Yes | $6-12 | $65-105 | Lowest dev cost |

### Quick Deploy via GitHub Actions

1. **Go to Actions tab** → `Multi-Cloud Deployment` → `Run workflow`
2. **Select**:
   - Cloud provider: `azure`, `aws`, `gcp`, or `all`
   - Environment: `dev`, `staging`, or `prod`
   - Action: `plan` (preview) or `apply` (deploy)
3. **Click** `Run workflow`

### Manual Terraform Deployment

```bash
# Choose your cloud
cd infra/azure  # or aws, or gcp

# Configure variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Set OpenAI key securely
export TF_VAR_openai_api_key="sk-proj-your-key-here"

# Deploy
terraform init
terraform plan
terraform apply
```

### Deployment Documentation

### Documentation

- 📘 **[Multi-Cloud Infrastructure Guide](./infra/README.md)** - Choose your cloud provider
- 📘 **[Multi-Cloud Summary](./docs/infrastructure/MULTI_CLOUD_SUMMARY.md)** - Detailed comparison
- 📘 **[Azure Deployment](./infra/azure/README.md)** - Azure Container Apps setup
- 📘 **[AWS Deployment](./infra/aws/README.md)** - ECS Fargate setup
- 📘 **[GCP Deployment](./infra/gcp/README.md)** - Cloud Run setup
- 📘 **[GitHub Actions Guide](./docs/GITHUB_ACTIONS_GUIDE.md)** - CI/CD setup

### Docker Production Build (Local)

```bash
# Build images
docker-compose build

# Run in production mode
ASPNETCORE_ENVIRONMENT=Production docker-compose up -d
```

## 🧪 Testing

### Frontend
```bash
cd src/fe
npm run build  # Test production build
npm run preview  # Preview production build
```

### Backend
```bash
cd src/be
dotnet build   # Compile
dotnet test    # Run tests (when added)
```

### Docker
```bash
# Test builds
docker-compose build

# Test health checks
curl http://localhost:5000/health/status
curl http://localhost:3000
```

## 🐛 Troubleshooting

### Common Issues

**1. OpenAI API Key Error**
```
Error: Unauthorized - Check OpenAI API key
Solution: Verify OPENAI_API_KEY in .env file
```

**2. CORS Errors**
```
Error: CORS policy blocked
Solution: Add frontend URL to AllowedOrigins in backend config
```

**3. Audio Not Working**
```
Error: Unable to access microphone
Solution: Grant browser microphone permissions
```

**4. Docker Port Conflicts**
```
Error: Port 3000 already in use
Solution: Stop conflicting service or change port in docker-compose.yml
```

### Logs

**Docker:**
```bash
docker-compose logs -f backend   # Backend logs
docker-compose logs -f frontend  # Nginx logs
```

**Local Development:**
```bash
# Backend logs in: src/be/logs/
# Frontend: Browser console
```

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Contributors

- Bridan - Initial development

## 🔗 Links

- [Architecture Documentation](./docs/architecture.md)
- [Backend README](./src/be/README.md)
- [Frontend README](./src/fe/README.md)
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)

## 🙏 Acknowledgments

- OpenAI for Realtime API
- shadcn/ui for component library
- Radix UI for accessible primitives
