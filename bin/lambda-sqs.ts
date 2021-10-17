#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LambdaSqsStack } from '../lib/lambda-sqs-stack';

const app = new cdk.App();
new LambdaSqsStack(app, 'LambdaSqsStack', {});
