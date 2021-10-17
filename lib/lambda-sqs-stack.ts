import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-nodejs'
import { Runtime } from '@aws-cdk/aws-lambda';
import * as path from 'path';
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment'

export class LambdaSqsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create bucket  and deploy photos to bucket 
    const bucket = new Bucket(this, 'LambdaSqsBucket',{
      encryption: BucketEncryption.S3_MANAGED
    })

    new BucketDeployment(this, 'LambdaSqsPhotos', {
      sources: [
        Source.asset(path.join(__dirname,'..','photos'))
      ],
      destinationBucket: bucket
    })

    // create lambda getPhotos, handler is in folder named api
    const getPhotos = new lambda.NodejsFunction(this,'LambdaSqsLambda',{
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, '..', 'api', 'get-photos', 'index.ts'),
      handler: 'getPhotos',
      environment: {
        PHOTO_BUCKET_NAME: bucket.bucketName
      }
    })

    // output values
    new cdk.CfnOutput(this,'LambdaSqsBucketNameExport',{
      value: bucket.bucketName,
      exportName: 'LambdaSqsBucketName'
    })
  }
}
