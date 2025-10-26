# InsightsGridAI - Enterprise Digital Twin Platform

An AWS-powered intelligent business analytics platform that provides real-time insights, AI-powered chat, and predictive simulations for enterprise operations.

**Live Demo:** [http://insightsgridai-results-1761385095.s3-website-us-east-1.amazonaws.com/](http://insightsgridai-results-1761385095.s3-website-us-east-1.amazonaws.com/)

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js 18+ and npm installed
- AWS CDK installed: `npm install -g aws-cdk`

### Deploy Everything
```bash
# Clone and navigate to project
cd /Users/vedantkandge/Documents/Hackathons/ABC

# Deploy infrastructure and frontend
./deploy.sh
```

The script will:
1. Deploy AWS infrastructure using CDK
2. Upload sample data to S3
3. Build and deploy React frontend
4. Display your website URL

## 🎯 Features

### 1. AI-Powered Chat (Dual Interfaces)
- **AI Chat Tab**: General business intelligence queries using Airia pipeline
- **Chat with Data Widget**: Data-specific queries with contextual insights
- Natural language interface for complex business questions
- Real-time responses with intelligent caching

### 2. Business Simulations
- **Fuel Price Impact Analysis**: Analyze cost effects of fuel price changes
- **Demand Forecasting**: Predict revenue and capacity requirements
- **Warehouse Expansion ROI**: Investment analysis for new facilities
- **Route Optimization**: Cost and time efficiency improvements

### 3. Real-Time Analytics Dashboard
- Interactive data visualizations
- Key performance indicators (KPIs)
- Regional performance breakdowns
- Trend analysis and forecasting
- Custom metrics and filters

### 4. Data Overview & Insights
- Financial metrics (revenue, costs, profit margins)
- Logistics performance (shipments, delivery times, fuel costs)
- Sales analytics (products, regions, customer segments)
- AI-generated insights and recommendations

## 🏗️ Architecture

### AWS Services
- **S3**: Data lake and static website hosting
- **Lambda**: Serverless compute (Python 3.11)
- **API Gateway**: HTTP API v2 & REST API
- **DynamoDB**: Session management and caching
- **Athena**: Serverless SQL queries
- **Glue**: Data catalog and ETL
- **CloudWatch**: Logging and monitoring

### Technology Stack
- **Frontend**: React 18, TypeScript, TailwindCSS, Recharts
- **Backend**: Python 3.11, AWS Lambda
- **AI/ML**: Airia AI platform with custom pipelines
- **Infrastructure**: AWS CDK (TypeScript)

### API Endpoints

#### HTTP API (Chat - 30s timeout)
**Base URL:** `https://aij9r8sc8i.execute-api.us-east-1.amazonaws.com`

- `POST /chat` - AI Chat interface (Airia pipeline: 0e2a6599)
- `POST /chat-with-data` - Data-aware chat (Airia pipeline: 70ef9a9d)

#### REST API (Data & Simulations)
**Base URL:** `https://h3qy1xq5kh.execute-api.us-east-1.amazonaws.com/prod/api`

- `GET /data?type=overview` - Business overview metrics
- `GET /data?type=trends` - Trend data for charts
- `GET /data?type=costs` - Cost analysis by route
- `POST /simulate` - Run business simulations

## 📊 Sample Data

The platform includes enhanced sample datasets:
- **finance.csv**: Revenue, costs, profit by date, region, department
- **logistics.csv**: Shipment data with carriers, routes, costs, fuel prices
- **sales.csv**: Product sales with categories, channels, forecasts
- **customers.csv**: Customer segments and demographics
- **inventory.csv**: Stock levels and warehouse data

## 🔧 Configuration

### Airia AI Integration

Both chat features use **Airia** with specialized pipelines:

**AI Chat Tab:**
- Pipeline ID: `0e2a6599-9c5f-40ac-9a39-456a53b7d935`
- Purpose: General business questions and analysis
- Timeout: 90 seconds

**Chat with Data Widget:**
- Pipeline ID: `70ef9a9d-5eb5-44e8-873b-e8060f024791`
- Purpose: Data-specific queries and insights
- Timeout: 90 seconds

**API Credentials:** Configured in Lambda environment variables via CDK

### Environment Variables

Lambda functions automatically configured with:
- `AIRIA_API_KEY`: Airia authentication key
- `AIRIA_USER_ID`: User identification for pipeline execution
- `ATHENA_DATABASE`: Data catalog database name
- `ATHENA_WORKGROUP`: Query execution workgroup

## 🛠️ Development

### Frontend Development
```bash
cd frontend
npm install
npm start
```

The development server will proxy API requests to your deployed endpoints.

### Infrastructure Development
```bash
cd infrastructure
npm install
npm run build
cdk diff    # Preview changes
cdk deploy  # Deploy changes
```

### Testing
```bash
# Test all API endpoints
./test-endpoints.sh

# Test chat features specifically
./test-both-airia.sh

# Comprehensive API testing
./comprehensive-test.sh
```

### Monitoring
```bash
# Watch Lambda logs
aws logs tail /aws/lambda/insights-grid-bedrock --follow
aws logs tail /aws/lambda/insights-grid-airia-chat --follow

# Check API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiId,Value=aij9r8sc8i \
  --start-time 2025-10-26T00:00:00Z \
  --end-time 2025-10-26T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## 📈 Business Value

### Speed & Efficiency
- Answers in seconds, not weeks
- Real-time data processing
- Instant what-if scenario analysis
- Automated insight generation

### Cost Savings
- Predicts and prevents costly decisions
- Identifies optimization opportunities
- Reduces manual analysis time by 70%+
- Pay-per-use serverless architecture

### Scalability
- Handles enterprise-scale data
- Auto-scaling based on demand
- No infrastructure management
- Global availability

### Estimated Costs
Monthly operational costs for mid-size company:
- Lambda: $50-100
- S3: $20-50
- Athena: $30-80
- DynamoDB: $20-40
- Airia AI: $100-300
- API Gateway: $10-30

**Total:** ~$230-600/month with 10x+ ROI potential

## 🔒 Security

- IAM roles with least privilege access
- S3 bucket encryption at rest
- API Gateway authentication ready
- CORS configured for frontend origin
- Environment variables for secrets
- CloudWatch audit logging

## 🐛 Troubleshooting

### Chat Features Timeout
**Issue:** Requests timeout after 29-30 seconds  
**Cause:** API Gateway has 29s (REST API) / 30s (HTTP API) hard limits  
**Solutions:**
- Simplify query complexity
- Check Airia pipeline performance
- Review CloudWatch logs for Airia 500 errors

### 404 Errors on Chat Endpoints
**Issue:** Endpoints return 404 Not Found  
**Solution:**
```bash
cd infrastructure
cdk deploy --force
```

### Frontend Not Loading Data
**Issue:** Dashboard shows loading indefinitely  
**Check:**
1. Browser console for API errors
2. API Gateway endpoints are deployed
3. Lambda functions are active
4. S3 data files are uploaded

### Airia Returns Errors
**Issue:** "Internal Server Error" from Airia  
**Solutions:**
1. Check Airia pipeline status at https://api.airia.ai/
2. Verify pipeline IDs in Lambda environment variables
3. Check Airia API key hasn't expired
4. Review CloudWatch logs for detailed errors

### Deployment Fails
**Issue:** CDK deploy errors  
**Common Fixes:**
```bash
# Clear CDK cache
cd infrastructure
rm -rf cdk.out/
npm run build
cdk bootstrap  # If first time
cdk deploy
```

## 📚 Documentation

- **DEPLOYMENT.md**: Detailed deployment guide and configuration
- **ARCHITECTURE.md**: Deep dive into system architecture and data flows
- **TROUBLESHOOTING.md**: Comprehensive problem-solving guide

## 🗑️ Cleanup

To destroy all AWS resources:
```bash
cd infrastructure
cdk destroy --all
```

⚠️ **Warning:** This will permanently delete:
- All Lambda functions
- API Gateway endpoints
- S3 buckets and data
- Athena workgroups
- CloudWatch logs

## 🎯 Use Cases

### Manufacturing
- Factory performance simulations
- Supply chain optimization
- Capacity planning
- Cost impact analysis

### Retail
- Inventory management
- Sales forecasting
- Regional performance analysis
- Customer behavior insights

### Logistics
- Route optimization
- Fuel cost management
- Delivery performance tracking
- Warehouse expansion planning

### Finance
- Revenue forecasting
- Cost optimization
- Budget impact analysis
- Profitability modeling

## 🚀 Future Enhancements

- [ ] Real-time IoT data integration
- [ ] Advanced ML models for predictions
- [ ] Multi-tenant support with Cognito
- [ ] Mobile application
- [ ] WebSocket real-time updates
- [ ] Advanced visualization features
- [ ] Custom data source connectors
- [ ] API rate limiting and caching
- [ ] CloudFront CDN distribution
- [ ] Custom domain with HTTPS

## 📄 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

This is a hackathon project. For questions or improvements, please open an issue or submit a pull request.

## 📞 Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Review TROUBLESHOOTING.md
3. Verify AWS permissions
4. Check deployment script output
5. Review API endpoint status

---

**Built with AWS Serverless Stack**  
Powered by Airia AI • React • AWS CDK  
Last Updated: October 2025
