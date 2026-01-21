// 
import * as cdk from 'aws-cdk-lib';
import { CdkdashTestPipelineStack } from '../lib/cdkdash-test-pipeline-stack';
import { CdkdashProdPipelineStack } from '../lib/cdkdash-prod-pipeline-stack';

const app = new cdk.App();

// You can keep both pipelines in the same account+region (as in your current code)
const account = '430058392451';
const region = 'us-east-1';

// ----- TEST PIPELINE -----
new CdkdashTestPipelineStack(app, 'CdkdashTestPipelineStack', {
  env: { account, region }, // where the pipeline *lives*
});

// ----- PROD PIPELINE -----
new CdkdashProdPipelineStack(app, 'CdkdashProdPipelineStack', {
  env: { account, region }, // where the pipeline *lives*
});
``
