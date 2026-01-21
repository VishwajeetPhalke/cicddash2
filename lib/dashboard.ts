// dashboard.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export interface DashStackProps extends cdk.StackProps {
  /** Logical environment label passed from stage (e.g., 'test' | 'prod') */
  envName?: string;
}
//this is the demo of the pipeline

export class DashStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: DashStackProps) {
    super(scope, id, props);

    const envName = props?.envName ?? 'dev';
    const baseDashboardName = 'Compute-And-Cost-Dashboard';

    // Always suffix the name per env to avoid conflicts across stages/accounts
    const dashboardName = `${baseDashboardName}-${envName}`;

    /* ================= VPC ================= */
    const vpc = new ec2.Vpc(this, 'DemoVpc', {
      maxAzs: 2,
    });

    /* ================= EC2 (t3.micro) ================= */
    const ec2Instance = new ec2.Instance(this, 'DemoEC2', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, { deleteOnTermination: true }),
        },
      ],
    });

    /* ================= Lambda (Demo) ================= */
    const demoLambda = new lambda.Function(this, 'DemoLambda', {
      runtime: lambda.Runtime.NODEJS_18_X, // or NODEJS_20_X if you prefer
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async () => {
          for (let i = 0; i < 5e6; i++) {}
          return "Lambda executed";
        };
      `),
    });

    // Schedule: invoke DemoLambda every 5 minutes
    new events.Rule(this, 'DemoLambdaSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(demoLambda)],
    });

    /* ================= DynamoDB ================= */
    const table = new dynamodb.Table(this, 'DemoTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    /* ================= S3 ================= */
    new s3.Bucket(this, 'DemoBucket');

    /* ================= Cost Metrics Lambda ================= */
    const costLambda = new lambda.Function(this, 'CostMetricsLambda', {
      runtime: lambda.Runtime.NODEJS_18_X, // or NODEJS_20_X
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(2),
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const ce = new AWS.CostExplorer();
        const cw = new AWS.CloudWatch();

        exports.handler = async () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString().split('T')[0];
          const end = now.toISOString().split('T')[0];

          const data = await ce.getCostAndUsage({
            TimePeriod: { Start: start, End: end },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
            GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
          }).promise();

          for (const g of data.ResultsByTime[0].Groups) {
            await cw.putMetricData({
              Namespace: 'Demo/CostMetrics',
              MetricData: [{
                MetricName: 'ServiceCost',
                Dimensions: [{ Name: 'Service', Value: g.Keys[0] }],
                Value: parseFloat(g.Metrics.UnblendedCost.Amount),
                Unit: 'None'
              }]
            }).promise();
          }
        };
      `),
    });

    costLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ce:GetCostAndUsage', 'cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Schedule: run cost metrics daily
    new events.Rule(this, 'DailyCostRule', {
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      targets: [new targets.LambdaFunction(costLambda)],
    });

    /* ================= CloudWatch Metrics ================= */
    // EC2 Compute
    const ec2CpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/EC2',
      metricName: 'CPUUtilization',
      dimensionsMap: { InstanceId: ec2Instance.instanceId },
      statistic: 'Average',
    });

    // Lambda Compute
    const lambdaDuration = demoLambda.metricDuration({ statistic: 'Average' });

    // DynamoDB Compute
    const dynamoRead = table.metricConsumedReadCapacityUnits();
    const dynamoWrite = table.metricConsumedWriteCapacityUnits();

    // Cost Metrics
    const ec2Cost = new cloudwatch.Metric({
      namespace: 'Demo/CostMetrics',
      metricName: 'ServiceCost',
      dimensionsMap: { Service: 'Amazon Elastic Compute Cloud - Compute' },
      statistic: 'Maximum',
    });

    const lambdaCost = new cloudwatch.Metric({
      namespace: 'Demo/CostMetrics',
      metricName: 'ServiceCost',
      dimensionsMap: { Service: 'AWS Lambda' },
      statistic: 'Maximum',
    });

    const dynamoCost = new cloudwatch.Metric({
      namespace: 'Demo/CostMetrics',
      metricName: 'ServiceCost',
      dimensionsMap: { Service: 'Amazon DynamoDB' },
      statistic: 'Maximum',
    });

    /* ================= Dashboard ================= */
    const dashboard = new cloudwatch.Dashboard(this, 'ComputeCostDashboard', {
      dashboardName,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'EC2 Compute (CPU %)',
        left: [ec2CpuMetric],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Compute (Duration ms)',
        left: [lambdaDuration],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Compute (RCU / WCU)',
        left: [dynamoRead, dynamoWrite],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Monthly Cost by Service',
        left: [ec2Cost, lambdaCost, dynamoCost],
        width: 24,
      })
    );

    // (Optional note) Creating IAM Users via IaC is generally discouraged for prod.
    // If you keep them, ensure your pipeline has CAPABILITY_NAMED_IAM.

    // USER A — DASHBOARD VIEWER
    const dashboardViewer = new iam.User(this, 'DashboardViewer');
    dashboardViewer.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ViewDashboard',
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:GetDashboard', 'cloudwatch:ListDashboards'],
        resources: ['*'],
      })
    );
    dashboardViewer.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ViewMetricsOnly',
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:GetMetricData'],
        resources: ['*'],
      })
    );

    // USER B — FULL DASHBOARD + METRIC ADMIN
    const dashboardAdmin = new iam.User(this, 'DashboardAdmin');
    dashboardAdmin.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DashboardFullControl',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudwatch:GetDashboard',
          'cloudwatch:ListDashboards',
          'cloudwatch:PutDashboard',
          'cloudwatch:DeleteDashboards',
        ],
        resources: ['*'],
      })
    );
    dashboardAdmin.addToPolicy(
      new iam.PolicyStatement({
        sid: 'FullMetricAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudwatch:GetMetricData',
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:ListMetrics',
        ],
        resources: ['*'],
      })
    );
  }
}



