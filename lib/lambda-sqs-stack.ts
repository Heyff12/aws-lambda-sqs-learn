import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-nodejs'
import { Runtime } from '@aws-cdk/aws-lambda';
import * as path from 'path';
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment'
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2'
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';

export class LambdaSqsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---------------------------bucket----------------------------------------------------------
    // create bucket  
    const bucket = new Bucket(this, 'LambdaSqsBucket',{
      encryption: BucketEncryption.S3_MANAGED
    })
    // deploy photos to bucket 
    new BucketDeployment(this, 'LambdaSqsPhotos', {
      sources: [
        Source.asset(path.join(__dirname,'..','photos'))
      ],
      destinationBucket: bucket
    })

    // ---------------------------lambda----------------------------------------------------------
    // create lambda getPhotos, handler is in folder named api
    const getPhotos = new lambda.NodejsFunction(this,'LambdaSqsLambda',{
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, '..', 'api', 'get-photos', 'index.ts'),
      handler: 'getPhotos',
      environment: {
        PHOTO_BUCKET_NAME: bucket.bucketName
      }
    })
    // create rights for lambda to access bucket
    const bucketContainerPermissions = new PolicyStatement();
    bucketContainerPermissions.addResources(bucket.bucketArn);
    bucketContainerPermissions.addActions('s3:ListBucket');

    const bucketPermissions = new PolicyStatement();
    bucketPermissions.addResources(`${bucket.bucketArn}/*`);
    bucketPermissions.addActions('s3:GetObject', 's3:PutObject')

    getPhotos.addToRolePolicy(bucketPermissions)
    getPhotos.addToRolePolicy(bucketContainerPermissions)

    // create api path to the lambda
    const httpApi = new HttpApi(this,'LambdaSqsHttpApi',{
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [ CorsHttpMethod.GET ]
      },
      apiName: 'photo-api',
      createDefaultStage: true
    })

    const lambdaIntegration = new LambdaProxyIntegration({
      handler: getPhotos
    });

    httpApi.addRoutes({
      path: '/getAllPhotos',
      methods: [
        HttpMethod.GET
      ],
      integration: lambdaIntegration
    })

    // output values
    new cdk.CfnOutput(this,'LambdaSqsBucketNameExport',{
      value: bucket.bucketName,
      exportName: 'LambdaSqsBucketName'
    })
    new cdk.CfnOutput(this,'LambdaSqsApi',{
      value: httpApi.url!,
      exportName: 'LambdaSqsApiEndPoint'
    })
  }
}
