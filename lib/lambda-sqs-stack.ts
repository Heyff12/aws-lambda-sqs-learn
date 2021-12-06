import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-nodejs'
import { Runtime } from '@aws-cdk/aws-lambda';
import * as path from 'path';
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment'
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2'
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as sqs from '@aws-cdk/aws-sqs';
import { Duration } from '@aws-cdk/core';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';

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

    // ---------------------------queue----------------------------------------------------------
    //create que and deadqueue
    const deadQueue = new sqs.Queue(this, 'LambdaSqsDeadQueue', {
      queueName: "lambdaSqsDeadQueue",
      retentionPeriod: Duration.days(14)
    })
    const queue = new sqs.Queue(this, 'LambdaSqsQueue', {
      queueName: "lambdaSqsQueue",
      deliveryDelay: Duration.seconds(30),
      retentionPeriod: Duration.days(4),
      visibilityTimeout: Duration.seconds(30),
      receiveMessageWaitTime: Duration.seconds(15),
      deadLetterQueue: {
        queue: deadQueue,
        maxReceiveCount: 3
      }
    });

    // create queue rights
    const queuePermissions = new PolicyStatement({
      actions: ['sqs:Get*','sqs:List*', 'sqs:SendMessage','sqs:ReceiveMessage','sqs:DeleteMessage'],
      effect: Effect.ALLOW,
      resources: [queue.queueArn]
    })
    // ---------------------------lambda----------------------------------------------------------
    // create an lambda which be trigger by sendmessage
    const getPhotosSqsEventLambda = new lambda.NodejsFunction(this, 'LambdaSqsEventLambda',{
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, '..', 'api', 'get-photos', 'index.ts'),
      handler: 'getPhotosSqsEvent',
    })
    // add sqs event
    getPhotosSqsEventLambda.addEventSource(new SqsEventSource(queue, {batchSize:1}))
    // add sqs rights
    getPhotosSqsEventLambda.addToRolePolicy(queuePermissions)


    // create lambda getPhotos, handler is in folder named api
    const getPhotos = new lambda.NodejsFunction(this,'LambdaSqsLambda',{
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, '..', 'api', 'get-photos', 'index.ts'),
      handler: 'getPhotos',
      environment: {
        PHOTO_BUCKET_NAME: bucket.bucketName,
        QUEUE_URL: queue.queueUrl
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
    // add sqs rights
    getPhotos.addToRolePolicy(queuePermissions)

    // ---------------------------apiGateway----------------------------------------------------------
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

    // ---------------------------website----------------------------------------------------------
    const websiteBucket = new Bucket(this,'LambdaSqsWebsiteBucket',{
      websiteIndexDocument: 'index.html',
      publicReadAccess: true
    })

    new BucketDeployment(this, 'LambdaSqsWebsiteBucketDeploy',{
      sources:[Source.asset(path.join(__dirname,'..','frontend','build'))],
      destinationBucket: websiteBucket
    })

    // const cloudFront = new Distribution(this,'LambdaSqsDistribution',{
    //   defaultBehavior: {origin: new S3Origin(websiteBucket)},
    //   domainNames: [props.dnsName],
    //   certificate: props.certificate
    // })

    // new ARecord(this,'MySimpleAppRecordApex',{
    //   zone: props.hostedZone,
    //   target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFront))
    // })

    // ---------------------------outputs----------------------------------------------------------
    // output values
    new cdk.CfnOutput(this,'LambdaSqsBucketNameExport',{
      value: bucket.bucketName,
      exportName: 'LambdaSqsBucketName'
    })
    new cdk.CfnOutput(this,'LambdaSqsWebsiteBucketExport',{
      value: websiteBucket.bucketName,
      exportName: 'LambdaSqsWebsiteBucket'
    })
    new cdk.CfnOutput(this,'LambdaSqsApi',{
      value: httpApi.url!,
      exportName: 'LambdaSqsApiEndPoint'
    })
  }
}
