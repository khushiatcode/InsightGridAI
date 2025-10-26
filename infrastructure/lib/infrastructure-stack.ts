import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
// Removed SageMaker - using Lambda + Athena instead
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class InsightsGridAiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference existing S3 buckets
    const financeBucket = s3.Bucket.fromBucketName(this, 'FinanceBucket', 'insightgridai-finance');
    const logisticsBucket = s3.Bucket.fromBucketName(this, 'LogisticsBucket', 'insightgridai-logistics');
    const salesBucket = s3.Bucket.fromBucketName(this, 'SalesBucket', 'insightgridai-sales');
    
    // Create a new bucket for Athena results and static hosting
    const resultsBucket = new s3.Bucket(this, 'InsightsGridResultsBucket', {
      bucketName: `insights-grid-results-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html'
    });

    // No DynamoDB needed - stateless architecture

    // Glue Database for data catalog
    const glueDatabase = new glue.CfnDatabase(this, 'InsightsGridDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: 'insights_grid_db',
        description: 'Database for InsightsGridAI data'
      }
    });

    // Glue Tables for each CSV
    const financeTable = new glue.CfnTable(this, 'FinanceTable', {
      catalogId: this.account,
      databaseName: 'insights_grid_db',
      tableInput: {
        name: 'finance',
        description: 'Financial data table',
        storageDescriptor: {
          location: `s3://insightgridai-finance/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: {
              'serialization.format': ',',
              'field.delim': ','
            }
          },
          columns: [
            { name: 'date', type: 'string' },
            { name: 'department', type: 'string' },
            { name: 'amount', type: 'double' },
            { name: 'currency', type: 'string' },
            { name: 'cost_type', type: 'string' },
            { name: 'notes', type: 'string' }
          ]
        }
      }
    });

    const logisticsTable = new glue.CfnTable(this, 'LogisticsTable', {
      catalogId: this.account,
      databaseName: 'insights_grid_db',
      tableInput: {
        name: 'logistics',
        description: 'Logistics data table',
        storageDescriptor: {
          location: `s3://insightgridai-logistics/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: {
              'serialization.format': ',',
              'field.delim': ','
            }
          },
          columns: [
            { name: 'date', type: 'string' },
            { name: 'region', type: 'string' },
            { name: 'route_id', type: 'string' },
            { name: 'fuel_used_l', type: 'double' },
            { name: 'fuel_price_per_l', type: 'double' },
            { name: 'delay_hr', type: 'double' },
            { name: 'shipment_volume_tons', type: 'double' },
            { name: 'carrier', type: 'string' }
          ]
        }
      }
    });

    const salesTable = new glue.CfnTable(this, 'SalesTable', {
      catalogId: this.account,
      databaseName: 'insights_grid_db',
      tableInput: {
        name: 'sales',
        description: 'Sales data table',
        storageDescriptor: {
          location: `s3://insightgridai-sales/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: {
              'serialization.format': ',',
              'field.delim': ','
            }
          },
          columns: [
            { name: 'date', type: 'string' },
            { name: 'order_id', type: 'string' },
            { name: 'region', type: 'string' },
            { name: 'product_id', type: 'string' },
            { name: 'units_sold', type: 'int' },
            { name: 'unit_price', type: 'double' },
            { name: 'channel', type: 'string' },
            { name: 'revenue', type: 'double' }
          ]
        }
      }
    });

    // Athena Workgroup
    const athenaWorkgroup = new athena.CfnWorkGroup(this, 'InsightsGridWorkgroup', {
      name: 'insights-grid-workgroup',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${resultsBucket.bucketName}/athena-results/`
        },
        enforceWorkGroupConfiguration: true
      }
    });

    // Lambda function for data processing and simulations (replaces SageMaker)
    const dataProcessorLambda = new lambda.Function(this, 'DataProcessorLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/data-processor'),
      timeout: cdk.Duration.minutes(5),
      environment: {
        FINANCE_BUCKET: 'insightgridai-finance',
        LOGISTICS_BUCKET: 'insightgridai-logistics',
        SALES_BUCKET: 'insightgridai-sales',
        RESULTS_BUCKET: resultsBucket.bucketName,
        WORKGROUP: athenaWorkgroup.name!
      }
    });

    // Lambda function for AI Chat (uses Airia pipeline 0e2a6599)
    const bedrockLambda = new lambda.Function(this, 'BedrockLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/bedrock'),
      timeout: cdk.Duration.seconds(90), // 90 seconds for Airia API
      environment: {
        FINANCE_BUCKET: 'insightgridai-finance',
        LOGISTICS_BUCKET: 'insightgridai-logistics',
        SALES_BUCKET: 'insightgridai-sales',
        RESULTS_BUCKET: resultsBucket.bucketName,
        WORKGROUP: athenaWorkgroup.name!,
        // SECURITY: Load from environment variables - never commit real credentials!
        AIRIA_API_KEY: process.env.AIRIA_API_KEY || 'YOUR_AIRIA_API_KEY_HERE',
        AIRIA_USER_ID: process.env.AIRIA_USER_ID || 'YOUR_AIRIA_USER_ID_HERE'
      }
    });

    // Lambda function for Airia Chat (Chat with Data widget)
    const airiaChatLambda = new lambda.Function(this, 'AiriaChatLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/airia-chat'),
      timeout: cdk.Duration.seconds(90), // 90 seconds for Airia API
      environment: {
        AIRIA_API_KEY: process.env.AIRIA_API_KEY || 'YOUR_AIRIA_API_KEY_HERE',
        AIRIA_USER_ID: process.env.AIRIA_USER_ID || 'YOUR_AIRIA_USER_ID_HERE'
      }
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'InsightsGridApi', {
      restApiName: 'InsightsGridAI API',
      description: 'API for InsightsGridAI Digital Twin',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    // API Gateway integrations
    const dataProcessorIntegration = new apigateway.LambdaIntegration(dataProcessorLambda);
    const bedrockIntegration = new apigateway.LambdaIntegration(bedrockLambda);
    const airiaChatIntegration = new apigateway.LambdaIntegration(airiaChatLambda);

    // API routes
    const dataResource = api.root.addResource('data');
    dataResource.addMethod('GET', dataProcessorIntegration);
    dataResource.addMethod('POST', dataProcessorIntegration);

    const chatResource = api.root.addResource('chat');
    chatResource.addMethod('POST', bedrockIntegration);

    const chatWithDataResource = api.root.addResource('chat-with-data');
    chatWithDataResource.addMethod('POST', airiaChatIntegration);

    const simulationResource = api.root.addResource('simulate');
    simulationResource.addMethod('POST', dataProcessorIntegration); // Use data processor for simulations

    // IAM permissions for existing S3 buckets
    financeBucket.grantRead(dataProcessorLambda);
    logisticsBucket.grantRead(dataProcessorLambda);
    salesBucket.grantRead(dataProcessorLambda);
    resultsBucket.grantReadWrite(dataProcessorLambda);
    
    financeBucket.grantRead(bedrockLambda);
    logisticsBucket.grantRead(bedrockLambda);
    salesBucket.grantRead(bedrockLambda);
    resultsBucket.grantReadWrite(bedrockLambda);

    // Airia Bedrock permissions (will be updated when we get Airia credentials)
    bedrockLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream'
      ],
      resources: ['*']
    }));

    // Athena permissions
    dataProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'athena:StartQueryExecution',
        'athena:GetQueryExecution',
        'athena:GetQueryResults',
        'athena:StopQueryExecution'
      ],
      resources: ['*']
    }));

    bedrockLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'athena:StartQueryExecution',
        'athena:GetQueryExecution',
        'athena:GetQueryResults',
        'athena:StopQueryExecution'
      ],
      resources: ['*']
    }));

    // Glue permissions
    dataProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'glue:GetTable',
        'glue:GetDatabase',
        'glue:GetPartitions'
      ],
      resources: ['*']
    }));

    bedrockLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'glue:GetTable',
        'glue:GetDatabase',
        'glue:GetPartitions'
      ],
      resources: ['*']
    }));

    // HTTP API v2 for chat endpoints (30 second timeout instead of 29)
    const httpApi = new apigatewayv2.HttpApi(this, 'InsightsGridHttpApi', {
      apiName: 'InsightsGridAI HTTP API',
      description: 'HTTP API for chat endpoints with 30s timeout',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // HTTP API integrations for chat endpoints
    const chatHttpIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
      'ChatIntegration',
      bedrockLambda,
      {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
      }
    );

    const chatWithDataHttpIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
      'ChatWithDataIntegration',
      airiaChatLambda,
      {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
      }
    );

    // Add HTTP API routes for chat
    httpApi.addRoutes({
      path: '/chat',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: chatHttpIntegration,
    });

    httpApi.addRoutes({
      path: '/chat-with-data',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: chatWithDataHttpIntegration,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'REST API Gateway URL (29s timeout)'
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: httpApi.url || httpApi.apiEndpoint,
      description: 'HTTP API URL for chat endpoints (30s timeout)'
    });

    new cdk.CfnOutput(this, 'ResultsBucketName', {
      value: resultsBucket.bucketName,
      description: 'S3 Results Bucket Name'
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `http://${resultsBucket.bucketName}.s3-website-${this.region}.amazonaws.com`,
      description: 'Frontend Website URL'
    });

    new cdk.CfnOutput(this, 'AthenaWorkgroup', {
      value: athenaWorkgroup.name!,
      description: 'Athena Workgroup Name'
    });
  }
}
