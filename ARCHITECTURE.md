# Architecture - InsightsGridAI

Comprehensive architecture documentation for the InsightsGridAI platform.

## 🏗️ System Overview

InsightsGridAI is a serverless enterprise analytics platform built on AWS that combines real-time data processing, AI-powered insights, and predictive simulations.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User / Browser                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend (S3)                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐    │
│  │ Overview │  │ AI Chat  │  │ Simulation │  │ Analytics│    │
│  └──────────┘  └──────────┘  └────────────┘  └──────────┘    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
│  ┌─────────────────────────┐  ┌──────────────────────────┐    │
│  │   HTTP API v2 (30s)     │  │   REST API (29s)         │    │
│  │   - /chat               │  │   - /api/data            │    │
│  │   - /chat-with-data     │  │   - /api/simulate        │    │
│  └─────────────────────────┘  └──────────────────────────┘    │
└────────────────┬──────────────────────┬──────────────────────────┘
                 │                      │
                 ▼                      ▼
┌────────────────────────────┐  ┌───────────────────────────────┐
│   Lambda Functions         │  │   Lambda Functions            │
│   - bedrock (AI Chat)      │  │   - data-processor            │
│   - airia-chat (Data)      │  │     (Athena queries)          │
│   Runtime: Python 3.11     │  │   Runtime: Python 3.11        │
│   Memory: 512MB            │  │   Memory: 256MB               │
│   Timeout: 180s            │  │   Timeout: 300s               │
└────────────────┬───────────┘  └───────────────┬───────────────┘
                 │                               │
                 ▼                               ▼
┌────────────────────────────┐  ┌───────────────────────────────┐
│   Airia AI Platform        │  │   AWS Data Layer              │
│   - Pipeline 0e2a6599      │  │   ┌─────────┐  ┌──────────┐  │
│   - Pipeline 70ef9a9d      │  │   │ Athena  │  │  Glue    │  │
│   - 90s timeout            │  │   └────┬────┘  └────┬─────┘  │
└────────────────────────────┘  │        │            │         │
                                 │        └────┬───────┘         │
                                 │             ▼                 │
                                 │   ┌─────────────────┐        │
                                 │   │  S3 Data Lake   │        │
                                 │   │  - finance.csv  │        │
                                 │   │  - logistics.csv│        │
                                 │   │  - sales.csv    │        │
                                 │   └─────────────────┘        │
                                 └───────────────────────────────┘
```

## 📦 Component Architecture

### Frontend Layer

**Technology:** React 18 + TypeScript + TailwindCSS

**Components:**
```
frontend/src/
├── App.tsx                    # Main application shell, routing
├── components/
│   ├── ChatInterface.tsx      # AI Chat tab (Airia pipeline 0e2a6599)
│   ├── ChatWithData.tsx       # Chat widget (Airia pipeline 70ef9a9d)
│   ├── DataOverview.tsx       # Analytics and data tables
│   └── SimulationPanel.tsx    # Business simulation interface
├── services/
│   └── api.ts                 # API client wrapper
└── utils/
    ├── charts.ts              # Chart configurations
    └── formatters.ts          # Data formatting utilities
```

**Key Features:**
- Single Page Application (SPA)
- Client-side routing
- Real-time data updates
- Responsive design (mobile-ready)
- Error boundary handling
- Loading states with skeletons

**State Management:**
- React hooks (useState, useEffect)
- Context for global state (optional)
- Local storage for preferences

### API Gateway Layer

#### HTTP API v2 (Chat Endpoints)

**Purpose:** Handle long-running AI chat requests

**Configuration:**
- API ID: `aij9r8sc8i`
- Timeout: 30 seconds
- Protocol: HTTP API v2
- CORS: Enabled (all origins)
- Stage: $default (auto-deploy)

**Routes:**
```
POST /chat
└─> Lambda: insights-grid-bedrock
    Purpose: General business queries
    Pipeline: 0e2a6599-9c5f-40ac-9a39-456a53b7d935

POST /chat-with-data
└─> Lambda: insights-grid-airia-chat
    Purpose: Data-specific queries
    Pipeline: 70ef9a9d-5eb5-44e8-873b-e8060f024791
```

**Why HTTP API?**
- 30s timeout vs 29s REST API
- Lower latency (~60% improvement)
- Lower cost (~70% cheaper)
- Simpler configuration

#### REST API (Data Endpoints)

**Purpose:** Quick data retrieval and simulations

**Configuration:**
- API ID: `h3qy1xq5kh`
- Timeout: 29 seconds
- Stage: prod
- CORS: Enabled

**Routes:**
```
GET /api/data
└─> Lambda: insights-grid-data-processor
    Query params: ?type=overview|trends|costs

POST /api/simulate
└─> Lambda: insights-grid-data-processor
    Body: { type, parameters }
```

### Lambda Functions Layer

#### bedrock Lambda (AI Chat)

**Purpose:** Handle general business questions via Airia

**Configuration:**
- Runtime: Python 3.11
- Memory: 512MB
- Timeout: 180 seconds
- Handler: index.handler

**Environment Variables:**
```python
AIRIA_API_KEY = "ak-Mzc2MjA0Mjk5NXwx..."
AIRIA_USER_ID = "019a1ca8-be4d-7f6a-8bf4-63d7ff1db5b5"
```

**Code Flow:**
```python
def handler(event, context):
    1. Extract message from request body
    2. Call Airia pipeline 0e2a6599
       - URL: https://api.airia.ai/v2/PipelineExecution/0e2a6599...
       - Timeout: 90 seconds
       - Headers: X-API-KEY, Content-Type
       - Payload: { userId, userInput, asyncOutput: false }
    3. Parse Airia response
    4. Return formatted JSON
```

**Error Handling:**
- 500 errors: "Internal error, try again"
- 429 errors: "Too many requests"
- Timeouts: "Request timed out"
- Network errors: "Connection failed"

#### airia-chat Lambda (Chat with Data)

**Purpose:** Handle data-specific queries via Airia

**Configuration:**
- Runtime: Python 3.11
- Memory: 512MB
- Timeout: 180 seconds
- Handler: index.handler

**Environment Variables:**
```python
AIRIA_API_KEY = "ak-Mzc2MjA0Mjk5NXwx..."
AIRIA_USER_ID = "019a1ca8-be4d-7f6a-8bf4-63d7ff1db5b5"
```

**Code Flow:** Similar to bedrock, but uses pipeline 70ef9a9d

**Pipeline Difference:**
- Pipeline 70ef9a9d is tuned for data queries
- Has access to business data context
- Optimized for structured data responses

#### data-processor Lambda (Data & Simulations)

**Purpose:** Execute Athena queries and run simulations

**Configuration:**
- Runtime: Python 3.11
- Memory: 256MB
- Timeout: 300 seconds
- Handler: index.handler

**Environment Variables:**
```python
ATHENA_DATABASE = "insights_grid_db"
ATHENA_WORKGROUP = "insights-grid-workgroup"
```

**Code Flow:**
```python
def handler(event, context):
    if request_type == "data":
        1. Parse query type (overview, trends, costs)
        2. Build Athena SQL query
        3. Execute via boto3
        4. Wait for results (up to 60s)
        5. Parse and format results
        6. Return JSON
    
    elif request_type == "simulate":
        1. Parse simulation type
        2. Load base data from S3/Athena
        3. Apply simulation parameters
        4. Calculate projected outcomes
        5. Return results with visualizations
```

**Athena Queries:**
```sql
-- Overview query
SELECT 
    SUM(revenue) as total_revenue,
    SUM(costs) as total_costs,
    COUNT(DISTINCT shipment_id) as active_shipments,
    COUNT(DISTINCT order_id) as total_orders
FROM combined_data
WHERE date >= current_date - interval '30' day;

-- Trends query
SELECT 
    date_trunc('week', date) as week,
    SUM(revenue) as weekly_revenue,
    SUM(costs) as weekly_costs
FROM finance
GROUP BY 1
ORDER BY 1 DESC
LIMIT 12;

-- Costs query
SELECT 
    route,
    AVG(cost) as avg_cost,
    COUNT(*) as shipment_count
FROM logistics
GROUP BY route
ORDER BY avg_cost DESC;
```

### Data Layer

#### S3 Data Lake

**Bucket Structure:**
```
insightgridai-finance/
└── finance.csv              # Financial transactions

insightgridai-logistics/
└── logistics.csv            # Shipment data

insightgridai-sales/
└── sales.csv                # Sales transactions

insightgridai-customers/
└── customers.csv            # Customer data

insightgridai-inventory/
└── inventory.csv            # Stock levels

insights-grid-results-{account}/
└── athena-results/          # Query results cache
```

**Data Formats:**
- CSV with headers
- UTF-8 encoding
- Date format: YYYY-MM-DD
- Decimal separator: .
- Null values: empty string or NULL

#### Glue Data Catalog

**Database:** `insights_grid_db`

**Tables:**
```
finance
├── date: date
├── region: string
├── department: string
├── revenue: double
├── costs: double
└── profit: double

logistics
├── date: date
├── route: string
├── carrier: string
├── shipments: int
├── cost: double
├── fuel_price: double
└── delivery_time: double

sales
├── date: date
├── product: string
├── category: string
├── channel: string
├── units_sold: int
├── revenue: double
├── forecast: double
└── discount: double
```

**Crawler:** Auto-updates schema when data changes

#### Athena Query Engine

**Workgroup:** `insights-grid-workgroup`

**Configuration:**
- Output location: s3://insights-grid-results-{account}/athena-results/
- Encryption: SSE-S3
- Query timeout: 60 seconds
- Result retention: 7 days

**Performance Optimization:**
- Partitioning by date (when applicable)
- Columnar format (Parquet) for large datasets
- Query result caching (24 hours)
- Workgroup query limits

### AI/ML Layer

#### Airia AI Platform

**Integration Method:** REST API

**Authentication:**
- API Key in X-API-KEY header
- User ID in request payload

**Pipeline Architecture:**

**Pipeline 0e2a6599 (General Chat):**
```
User Query
    ↓
Airia NLP Processing
    ↓
Context Understanding
    ↓
Business Knowledge Base
    ↓
Response Generation
    ↓
Formatted Response
```

**Pipeline 70ef9a9d (Data Chat):**
```
User Query
    ↓
Airia NLP Processing
    ↓
Data Context Injection
    ↓
Query Understanding
    ↓
Data Analysis
    ↓
Insight Generation
    ↓
Formatted Response
```

**Request Format:**
```json
{
  "userId": "019a1ca8-be4d-7f6a-8bf4-63d7ff1db5b5",
  "userInput": "What is our total revenue?",
  "asyncOutput": false
}
```

**Response Format:**
```json
{
  "$type": "string",
  "result": "Based on the data, your total revenue is $1,810,845..."
}
```

**Performance:**
- Average response: 20-25 seconds
- 95th percentile: 28 seconds
- Timeout: 90 seconds

## 🔄 Data Flow Diagrams

### Chat Request Flow

```
User sends message
    ↓
React component (ChatInterface.tsx)
    ↓
fetch() with 60s timeout
    ↓
HTTP API Gateway (30s max)
    ↓
Lambda function invoked
    ↓
Airia API called (90s timeout)
    ↓
Airia processes request
    ↓
Response returned to Lambda
    ↓
Lambda formats response
    ↓
API Gateway returns to frontend
    ↓
React displays message
```

**Timeout Cascade:**
- Frontend: 60 seconds
- API Gateway: 30 seconds ⚠️ (bottleneck)
- Lambda: 180 seconds
- Airia: 90 seconds

**Note:** API Gateway's 30s limit is the effective timeout for chat requests.

### Data Query Flow

```
User loads dashboard
    ↓
React component (DataOverview.tsx)
    ↓
fetch('/api/data?type=overview')
    ↓
REST API Gateway
    ↓
data-processor Lambda
    ↓
Athena query execution
    ↓
S3 data scan
    ↓
Results returned to Lambda
    ↓
Lambda aggregates/formats
    ↓
JSON returned to frontend
    ↓
Charts rendered
```

**Performance:**
- Athena query: 2-5 seconds
- Data formatting: < 1 second
- Total: 3-6 seconds

### Simulation Flow

```
User submits simulation
    ↓
SimulationPanel.tsx
    ↓
POST /api/simulate { type, parameters }
    ↓
data-processor Lambda
    ↓
Load base data from Athena
    ↓
Apply simulation logic
    ↓
Calculate projections
    ↓
Generate visualization data
    ↓
Return results
    ↓
Frontend renders charts
```

**Simulation Types:**
1. **Fuel Price Impact**
   - Input: % increase/decrease
   - Calculation: cost * (1 + fuel_change%)
   - Output: Projected costs by route

2. **Demand Forecast**
   - Input: Growth rate
   - Calculation: sales * (1 + growth_rate%) ^ months
   - Output: Revenue projections, capacity needs

3. **Warehouse Expansion**
   - Input: Investment amount, capacity increase
   - Calculation: ROI over time period
   - Output: Break-even analysis, projected savings

## 🔐 Security Architecture

### Authentication & Authorization

**Current State:** No authentication (demo/hackathon)

**Production Recommendation:**
```
User Login
    ↓
Amazon Cognito
    ↓
JWT Token issued
    ↓
API Gateway validates JWT
    ↓
Lambda receives user context
```

### Network Security

**API Gateway:**
- HTTPS only (TLS 1.2+)
- CORS configured for specific origin
- Throttling: 10,000 requests/second
- Rate limiting per API key

**Lambda:**
- VPC isolation (optional)
- Security groups
- No public internet access required

### Data Security

**At Rest:**
- S3: SSE-S3 encryption
- DynamoDB: Encryption enabled
- Athena results: Encrypted

**In Transit:**
- HTTPS everywhere
- TLS 1.2+ required
- No plain HTTP

**Access Control:**
- IAM roles with least privilege
- Resource-based policies
- No hard-coded credentials

## 📊 Performance & Scalability

### Scalability Characteristics

**Lambda Functions:**
- Concurrent executions: 1000 (account limit)
- Auto-scaling: Automatic
- Cold start: ~2-3 seconds (Python 3.11)
- Warm execution: ~100-200ms

**API Gateway:**
- HTTP API: 10,000 RPS default
- REST API: 10,000 RPS default
- Burst capacity: 5,000 requests
- Throttling: Configurable

**Athena:**
- Concurrent queries: 25 (per region)
- Data scanned: Unlimited
- Performance: Scales with data size

**S3:**
- Throughput: 3,500 PUT/5,500 GET per prefix per second
- Storage: Unlimited
- Latency: Single-digit milliseconds

### Performance Optimization

**Frontend:**
- Code splitting (React.lazy)
- Image optimization
- Gzip compression
- Browser caching (Cache-Control headers)
- Service worker (future)

**Backend:**
- Lambda SnapStart (future)
- Provisioned concurrency for critical functions
- Query result caching in DynamoDB
- Connection pooling (if using RDS)

**Data:**
- Athena partition pruning
- Columnar format (Parquet)
- Data compression
- Result caching

## 💰 Cost Architecture

### Monthly Cost Estimate (Mid-size Company)

**Lambda:**
- Requests: 1M invocations = $0.20
- Compute: 100GB-seconds = $1.67
- Total: ~$50-100/month

**API Gateway:**
- HTTP API: 1M requests = $1.00
- REST API: 1M requests = $3.50
- Total: ~$10-30/month

**S3:**
- Storage: 100GB = $2.30
- GET requests: 1M = $0.40
- PUT requests: 100K = $0.50
- Total: ~$20-50/month

**Athena:**
- Data scanned: 1TB = $5.00
- Monthly queries: ~5TB scanned = $25
- Total: ~$30-80/month

**Airia AI:**
- Usage-based pricing
- Estimated: $100-300/month

**Total: ~$230-600/month**

### Cost Optimization Strategies

1. **S3 Lifecycle Policies:**
   - Move old data to Glacier after 90 days
   - Delete Athena results after 7 days

2. **Athena Optimization:**
   - Use Parquet format (70% less data scanned)
   - Partition tables by date
   - Use columnar storage

3. **Lambda:**
   - Right-size memory (use Lambda Power Tuning)
   - Use ARM64 architecture (20% cheaper)
   - Enable SnapStart

4. **API Gateway:**
   - Use HTTP API instead of REST API
   - Implement caching
   - Set up throttling

---

**Last Updated:** October 2025  
**Architecture Version:** 1.0  
**Cloud Provider:** AWS

