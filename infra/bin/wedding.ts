#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { WeddingStack } from '../lib/wedding-stack'

const app = new cdk.App()
new WeddingStack(app, 'WeddingSiteStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
})
