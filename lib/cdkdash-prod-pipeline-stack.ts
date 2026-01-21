
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
  // ManualApprovalStep,  // keep if you still want manual gating
} from 'aws-cdk-lib/pipelines';

// NEW imports
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

import { CicdStage } from './cicddasstage';

export class CdkdashProdPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CdkPipelinesCodePipeline(this, 'ProdPipeline', {
      pipelineName: 'Cicddash-Pipeline-Prod',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicddash2',
          'main',
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // ---- PROD STAGE ONLY ----
    const prod = new CicdStage(this, 'prod', {
      env: { account: '430058392451', region: 'us-east-1' },
      envName: 'prod',
    });

    pipeline.addStage(prod);

    // If you still want a human in the loop, uncomment:
    // const stage = pipeline.addStage(prod);
    // stage.addPre(new ManualApprovalStep('ProdApproval'));

    // --------------- AUTO-TRIGGER ON TEST SUCCESS ---------------
    // Underlying low-level CodePipeline object of the high-level CDK Pipelines
    const lowLevelProdPipeline = pipeline.pipeline;

    // Name of the TEST pipeline (must match your Test pipelineName)
    const testPipelineName = 'Cicddash-Pipeline-Test';

    // EventBridge rule: when Test pipeline EXECUTION succeeds -> start Prod pipeline
    new events.Rule(this, 'TriggerProdOnTestSuccess', {
      description: 'Start Prod pipeline when Test pipeline succeeds',
      eventPattern: {
        source: ['aws.codepipeline'],
        detailType: ['CodePipeline Pipeline Execution State Change'],
        detail: {
          pipeline: [testPipelineName],
          state: ['SUCCEEDED'],
        },
      },
      targets: [new targets.CodePipeline(lowLevelProdPipeline)],
    });
  }
}

