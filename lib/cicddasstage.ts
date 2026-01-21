// cicddasstage.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DashStack, DashStackProps } from './dashboard';

export interface CicdStageProps extends cdk.StageProps {
  /** Logical environment label, e.g., 'test' | 'prod' */
  envName: string;
}

export class CicdStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: CicdStageProps) {
    super(scope, id, props);

    // Create the application stack with env-aware names
    new DashStack(this, 'DashStack', {
      env: props.env,
      envName: props.envName,
      stackName: `Cicddash-${props.envName}-DashStack`,
      description: `Dashboard and compute stack for ${props.envName}`,
    } as DashStackProps);
  }
}
