import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';

import * as path from 'path';

import { Construct } from 'constructs';
import { ResourceNames, Timeouts, EventNames, Cron } from '../src/aws/enums';
require('dotenv').config();

export class ServerlessScraperStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const scrapedCompanyDataQueue = new sqs.Queue(
            this,
            ResourceNames.STOCKS_QUEUE,
            {
                fifo: true,
                queueName: `${ResourceNames.STOCKS_QUEUE}.fifo`,
                contentBasedDeduplication: true, // Optional: Enables content-based deduplication
                visibilityTimeout: cdk.Duration.seconds(
                    Timeouts.STOCKS_QUEUE_VISIBILITY_TIMEOUT_SECONDS
                ),
            }
        );

        const layer = new lambda.LayerVersion(this, 'ScraperDependencies', {
            code: lambda.Code.fromAsset('src/layers/scraper'),
            description: 'Necessary scraper dependencies',
            compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // @ts-ignore
        const getEarningsDataLambda = new nodejs.NodejsFunction(
            this,
            ResourceNames.GET_EARNINGS_DATA,
            {
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: path.join(
                    __dirname,
                    `/../src/lambda/scrapers/getEarningsData/getEarningsData.ts`
                ),
                handler: 'handler',
                timeout: cdk.Duration.minutes(Timeouts.LAMBDA_TIMEOUT_MINUTES),
                layers: [layer],
                memorySize: 1024,
                bundling: {
                    // Include layers here
                    externalModules: ['scraper'],
                    sourceMap: true,
                },
                environment: {
                    QUEUE_URL: scrapedCompanyDataQueue.queueUrl,
                },
            }
        );

        const adminRole = new iam.Role(this, 'ScraperLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        adminRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: ['*'],
                actions: ['*'],
            })
        );

        scrapedCompanyDataQueue.grantSendMessages(getEarningsDataLambda);

        const rootScraper = new nodejs.NodejsFunction(
            this,
            ResourceNames.SCRAPER_ROOT_WORKER,
            {
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: path.join(
                    __dirname,
                    `/../src/lambda/scrapers/root/root.ts`
                ),
                handler: 'handler',
                timeout: cdk.Duration.minutes(Timeouts.LAMBDA_TIMEOUT_MINUTES),
                memorySize: 1024,
                bundling: {
                    // Include layers here
                    sourceMap: true,
                },
                role: adminRole,
                environment: {
                    STACK_NAME: this.stackName,
                },
            }
        );

        new nodejs.NodejsFunction(this, ResourceNames.UPSERT_LOG_STREAM, {
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: path.join(
                __dirname,
                `/../src/lambda/loggers/upsertLogStream.ts`
            ),
            handler: 'handler',
            timeout: cdk.Duration.minutes(Timeouts.LAMBDA_TIMEOUT_MINUTES),
            memorySize: 384,
            bundling: {
                // Include layers here
                sourceMap: true,
            },
            environment: {
                SLACK_API_BOT_TOKEN: process.env.SLACK_API_BOT_TOKEN as string,
            },
            role: adminRole,
        });

        const rule = new events.Rule(this, EventNames.LAMBDA_CRON_TRIGGER, {
            schedule: events.Schedule.expression(
                Cron.INTERVALS_OF_X_MINUTES_WEEKDAYS
            ),
        });

        getEarningsDataLambda.grantInvoke(rootScraper);

        rule.addTarget(new targets.LambdaFunction(rootScraper));

        new cdk.CfnOutput(this, 'getEarningsDataLambdaArn', {
            value: getEarningsDataLambda.functionArn,
        });
    }
}
