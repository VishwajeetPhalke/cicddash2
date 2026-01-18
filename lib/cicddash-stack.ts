import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';

export class CicddashStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CicddashQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const pipeline = new CodePipeline(this, 'demopipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicddash2',
          'main',{
            connectionArn: 'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529'
          }  
        ),
       
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });
  }
}
