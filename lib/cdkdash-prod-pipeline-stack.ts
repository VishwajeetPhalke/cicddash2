
// import * as cdk from 'aws-cdk-lib';
// import { Construct } from 'constructs';
// import {
//   CodePipeline,
//   CodePipelineSource,
//   ShellStep,
//   ManualApprovalStep,
// } from 'aws-cdk-lib/pipelines';
// import { CicdStage } from './cicddasstage';

// export class CdkdashProdPipelineStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     const pipeline = new CodePipeline(this, 'ProdPipeline', {
//       pipelineName: 'Cicddash-Pipeline-Prod',
//       synth: new ShellStep('Synth', {
//         input: CodePipelineSource.connection(
//           'VishwajeetPhalke/cicddash2', // repo
//           'main',                       // branch to watch for prod
//           {
//             connectionArn:
//               'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
//           }
//         ),
//         commands: ['npm ci', 'npm run build', 'npx cdk synth'],
//       }),
//     });

//     // ---- PROD STAGE ONLY ----
//     const prod = new CicdStage(this, 'prod', {
//       env: { account: '430058392451', region: 'us-east-1' },
//       envName: 'prod',
//     });

//     const prodStage = pipeline.addStage(prod);

//     // Optional: gate production with manual approval
//     prodStage.addPre(new ManualApprovalStep('ProdApproval'));
//   }
// }



import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline as CdkPipelinesCodePipeline,
  CodePipelineSource,
  ShellStep,
} from 'aws-cdk-lib/pipelines';

import { CicdStage } from './cicddasstage';

// NEW imports for auto-triggering Prod Pipeline
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cp from 'aws-cdk-lib/aws-codepipeline';

export class CdkdashProdPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -------------------------------------------
    // 1) Create the PROD Pipeline
    // -------------------------------------------
    const pipeline = new CdkPipelinesCodePipeline(this, 'ProdPipeline', {
      pipelineName: 'Cicddash-Pipeline-Prod',

      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicddash2', // GitHub Repo
          'main',                       // Branch for Prod
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // -------------------------------------------
    // 2) Add PROD deployment stage
    // -------------------------------------------
    const prod = new CicdStage(this, 'prod', {
      env: { account: '430058392451', region: 'us-east-1' },
      envName: 'prod',
    });

    pipeline.addStage(prod);

    // -------------------------------------------
    // 3) AUTO-TRIGGER PROD WHEN TEST SUCCEEDS
    
// AUTO-TRIGGER PROD WHEN TEST SUCCEEDS

const testPipelineName = 'Cicddash-Pipeline-Test';
const prodPipelineName = 'Cicddash-Pipeline-Prod';

// Import the existing PROD pipeline safely via ARN
const importedProdPipeline = cp.Pipeline.fromPipelineArn(
  this,
  'ImportedProdPipeline',
  `arn:aws:codepipeline:us-east-1:430058392451:${prodPipelineName}`
);

// EventBridge rule – when TEST succeeds → start PROD
new events.Rule(this, 'TriggerProdOnTestSuccess', {
  description: 'Automatically start Prod pipeline when Test pipeline succeeds',
  eventPattern: {
    source: ['aws.codepipeline'],
    detailType: ['CodePipeline Pipeline Execution State Change'],
    detail: {
      pipeline: [testPipelineName],
      state: ['SUCCEEDED'],
    },
  },
  targets: [new targets.CodePipeline(importedProdPipeline)],
});


  }
}


