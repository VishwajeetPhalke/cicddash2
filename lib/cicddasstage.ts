import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import {DashStack} from './dashboard';

export class CicdStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);
    
    const dashStack = new DashStack(this,'DashStack');

  }
}

