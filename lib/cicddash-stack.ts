// import * as cdk from 'aws-cdk-lib/core';
// import { Construct } from 'constructs';
// // import * as sqs from 'aws-cdk-lib/aws-sqs';
// import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
// import { CicdStage } from './cicddasstage';
// import { ManualApprovalStep } from 'aws-cdk-lib/pipelines';

// export class CicddashStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     // The code that defines your stack goes here

//     // example resource
//     // const queue = new sqs.Queue(this, 'CicddashQueue', {
//     //   visibilityTimeout: cdk.Duration.seconds(300)
//     // });

//     const pipeline = new CodePipeline(this, 'demopipeline', {
//       synth: new ShellStep('Synth', {
//         input: CodePipelineSource.connection(
//           'VishwajeetPhalke/cicddash2',
//           'main',{
//             connectionArn: 'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529'
//           }  
//         ),
       
//         commands: ['npm ci', 'npm run build', 'npx cdk synth'],
//       }),
//     });

//     //create the test stage 
//     const teststage= pipeline.addStage(new CicdStage(this,'test',{
//       env:{account:'430058392451',region:'us-east-1'}
//     }));




//     //manual approval creation so that the user can check whether all the changes a re correct and then deploy all the changes to the production stage
//     // If this step is added to a Pipeline, the Pipeline will be paused waiting for a human to resume it
//     // Only engines that support pausing the deployment will support this step type.
//     teststage.addPost(new ManualApprovalStep('approval'));


//     //create the productionstage
//     const prodstage= pipeline.addStage(new CicdStage(this,'prod',{
//       env:{account:'430058392451',region:'us-east-1'}
//     }));
//   }
// }



// cicddash-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
  ManualApprovalStep,
} from 'aws-cdk-lib/pipelines';
import { CicdStage } from './cicddasstage';

export class CicddashStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'demopipeline', {
      pipelineName: 'Cicddash-Pipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicddash2', // repo
          'main',                       // branch
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // ---- TEST STAGE ----
    const test = pipeline.addStage(
      new CicdStage(this, 'test', {
        env: { account: '430058392451', region: 'us-east-1' },
        envName: 'test',
      })
    );

    // Manual approval before prod
    test.addPost(new ManualApprovalStep('approval'));

    // ---- PROD STAGE ----
    pipeline.addStage(
      new CicdStage(this, 'prod', {
        env: { account: '430058392451', region: 'us-east-1' },
        envName: 'prod',
      })
    );
  }
}
