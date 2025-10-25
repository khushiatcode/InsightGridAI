# InsightsGridAI - AWS Digital Twin Copilot for Enterprises

## 🧠 Overview

InsightsGridAI is a comprehensive AWS-powered digital twin solution that helps enterprises understand their business operations through real-time data analysis, AI-powered simulations, and intelligent recommendations.

## 🏗️ Architecture

### AWS Services Used
- **S3**: Data storage for CSV files and static website hosting
- **Lambda**: Serverless compute for data processing, Bedrock integration, and SageMaker simulations
- **API Gateway**: RESTful API endpoints
- **DynamoDB**: Session management and caching
- **Athena**: Serverless SQL queries on S3 data
- **Glue**: Data catalog and ETL
- **Bedrock**: AI-powered chat interface using Claude
- **SageMaker**: ML models for business simulations
- **CloudFormation**: Infrastructure as Code

### Components
1. **Data Pipeline**: S3 → Glue → Athena for data processing
2. **AI Chat**: Bedrock-powered natural language interface
3. **Simulations**: SageMaker models for "what-if" scenarios
4. **Dashboard**: React frontend with real-time charts
5. **API Layer**: Lambda functions with API Gateway

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js and npm installed
- AWS CDK installed (`npm install -g aws-cdk`)

### Deployment
```bash
# Clone and navigate to the project
cd /Users/khushisavaliya/Downloads/ABC

# Run the deployment script
./deploy.sh
```

The script will:
1. Deploy AWS infrastructure using CDK
2. Upload sample data to S3
3. Build and deploy the React frontend
4. Provide you with the website URL

## 📊 Sample Data

The project includes sample CSV files:
- `finance.csv`: Revenue, costs, profit data by date and region
- `logistics.csv`: Shipment data with costs, duration, and fuel prices
- `sales.csv`: Product sales data with demand forecasts

## 🎯 Features

### 1. AI Chat Interface
- Natural language queries about business operations
- Powered by Amazon Bedrock (Claude)
- Context-aware conversations
- Quick question suggestions

### 2. Business Simulations
- **Fuel Price Impact**: Analyze cost effects of fuel price changes
- **Demand Forecast**: Predict revenue and capacity needs
- **Warehouse Expansion**: ROI analysis for new facilities
- **Route Optimization**: Cost and time efficiency improvements

### 3. Analytics Dashboard
- Real-time charts and visualizations
- Key performance indicators
- Regional performance analysis
- AI-generated insights and recommendations

### 4. Data Overview
- Financial metrics (revenue, costs, profit)
- Logistics performance (shipments, costs, fuel prices)
- Sales trends and forecasts
- Interactive charts and filters

## 🔧 API Endpoints

### Data Processing
- `GET /api/data?type=overview` - Get business overview metrics
- `GET /api/data?type=trends` - Get trend data for charts
- `GET /api/data?type=costs` - Get cost analysis by route
- `POST /api/data` - Process custom queries

### AI Chat
- `POST /api/chat` - Send message to AI assistant

### Simulations
- `POST /api/simulate` - Run business simulations

## 🛠️ Development

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Infrastructure Development
```bash
cd infrastructure
npm install
npm run build
cdk deploy
```

### Local Testing
The frontend can be run locally and will connect to the deployed API endpoints.

## 📈 Business Value

### Speed
- Answers in seconds, not weeks
- Real-time data processing
- Instant simulations

### Savings
- Predicts and prevents costly decisions
- Identifies optimization opportunities
- Reduces manual analysis time

### Clarity
- Turns complex data into actionable insights
- Natural language explanations
- Visual dashboards

### Scalability
- Serverless architecture
- Handles enterprise-scale data
- Auto-scaling based on demand

## 🔒 Security

- IAM roles and policies for least privilege access
- S3 bucket encryption
- API Gateway authentication
- VPC endpoints for private communication
- Data encryption at rest and in transit

## 💰 Cost Optimization

### Estimated Monthly Costs (for mid-size company)
- **Lambda**: $50-100 (based on usage)
- **S3**: $20-50 (storage and requests)
- **Athena**: $30-80 (query execution)
- **DynamoDB**: $20-40 (on-demand billing)
- **Bedrock**: $100-300 (AI model usage)
- **API Gateway**: $10-30 (API calls)

**Total**: ~$230-600/month

### Potential Savings
- 10x ROI through cost optimizations
- Reduced manual analysis time
- Better decision-making
- Prevented costly mistakes

## 🎯 Use Cases

### Manufacturing
- Factory performance simulation
- Supply chain optimization
- Cost impact analysis
- Capacity planning

### Retail
- Inventory management
- Logistics optimization
- Demand forecasting
- Regional performance analysis

### Energy
- Price impact analysis
- Production optimization
- Risk assessment
- Resource allocation

## 🔄 Maintenance

### Updates
- Run `./deploy.sh` to update the deployment
- Infrastructure changes require CDK deployment
- Frontend updates can be deployed independently

### Monitoring
- CloudWatch logs for Lambda functions
- S3 access logs
- API Gateway metrics
- DynamoDB metrics

### Backup
- S3 versioning enabled
- DynamoDB point-in-time recovery
- Cross-region replication available

## 🗑️ Cleanup

To destroy all resources:
```bash
cd infrastructure
cdk destroy --all
```

## 📞 Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Verify AWS permissions
3. Ensure all dependencies are installed
4. Check the deployment script output

## 🚀 Future Enhancements

- Real-time IoT data integration
- Advanced ML models
- Multi-tenant support
- Mobile application
- Advanced visualization features
- Integration with more AWS services

---

**Built with ❤️ using AWS services**
