
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { CicdStage } from './cicddasstage';

export class CdkdashTestPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'TestPipeline', {
      pipelineName: 'Cicddash-Pipeline-Test',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicddash2', // repo
          'main',                       // branch to watch (change to 'develop' if you use it)
          {
            connectionArn:
              'arn:aws:codeconnections:us-east-1:430058392451:connection/b1b0d224-2619-4c1b-a7cb-b56248c3f529',
          }
        ),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
      // crossAccountKeys: false, // keep default true if you ever deploy cross-account
    });

    // ---- TEST STAGE ONLY ----
    pipeline.addStage(
      new CicdStage(this, 'test', {
        env: { account: '430058392451', region: 'us-east-1' },
        envName: 'test',
      })
    );
  }
}
``
