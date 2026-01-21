
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
  ManualApprovalStep,
} from 'aws-cdk-lib/pipelines';
import { CicdStage } from './cicddasstage';

export class CdkdashProdPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'ProdPipeline', {
      pipelineName: 'Cicddash-Pipeline-Prod',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'VishwajeetPhalke/cicddash2', // repo
          'main',                       // branch to watch for prod
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

    const prodStage = pipeline.addStage(prod);

    // Optional: gate production with manual approval
    prodStage.addPre(new ManualApprovalStep('ProdApproval'));
  }
}
