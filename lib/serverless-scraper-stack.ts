import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';

import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

import * as path from 'path';

import { Construct } from 'constructs';
import {
    ResourceNames,
    Timeouts,
    EventNames,
    Cron,
    CFNOutputs,
    DATABASE,
} from '../src/aws/enums';
require('dotenv').config();

export class ServerlessScraperStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, {
            env: {
                account: process.env.CDK_DEFAULT_ACCOUNT,
                region: process.env.CDK_DEFAULT_REGION,
            },
            ...props,
        });

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

        const dbCredentials = new secretsmanager.Secret(this, 'DbCredentials', {
            description: 'RDS Instance credentials',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: process.env.DB_USERNAME,
                }),
                generateStringKey: 'password',
                excludeCharacters: '@%\'/\\\\" ',
            },
        });

        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });

        const lambdaSecurityGroup = new ec2.SecurityGroup(
            this,
            'lambdaSecurityGroup',
            {
                vpc,
                description:
                    'Allow all outbound traffic and inbound traffic from RDS instance',
                allowAllOutbound: true,
            }
        );

        const rdsSecurityGroup = new ec2.SecurityGroup(
            this,
            'rdsSecurityGroup',
            {
                vpc,
                description:
                    'Allow all outbound traffic and inbound traffic from Lambda functions',
                allowAllOutbound: true,
            }
        );

        // rdsSecurityGroup.addIngressRule(
        //     lambdaSecurityGroup,
        //     ec2.Port.tcp(Number(process.env.DB_PORT) as unknown as number),
        //     'Allow PostgreSQL inbound from Lambda Security Group'
        // );
        lambdaSecurityGroup.addEgressRule(
            rdsSecurityGroup,
            ec2.Port.tcp(5432),
            'Allow PostgreSQL outbound to RDS Security Group'
        );

        lambdaSecurityGroup.addIngressRule(
            rdsSecurityGroup,
            ec2.Port.tcp(5432),
            'Allow PostgreSQL outbound to RDS Security Group'
        );

        // rdsSecurityGroup.addEgressRule(
        //     lambdaSecurityGroup,
        //     ec2.Port.tcp(5432),
        //     'Allow PostgreSQL inbound from Lambda Security Group'
        // );

        rdsSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(5432),
            'Allow PostgreSQL inbound from Lambda Security Group'
        );

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

        new nodejs.NodejsFunction(
            this,
            ResourceNames.GET_MACRO_INDICATORS_DATA,
            {
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: path.join(
                    __dirname,
                    `/../src/lambda/scrapers/getMacroIndicatorsData/getMacroIndicatorsData.ts`
                ),
                handler: 'handler',
                timeout: cdk.Duration.minutes(2),
                layers: [layer],
                memorySize: 1024,
                bundling: {
                    // Include layers here
                    externalModules: ['scraper'],
                    sourceMap: true,
                },
                environment: {
                    STACK_NAME: this.stackName,
                },
                role: adminRole,
                securityGroups: [lambdaSecurityGroup],
            }
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

        new cdk.CfnOutput(this, CFNOutputs.GET_EARNINGS_DATA_ARN, {
            value: getEarningsDataLambda.functionArn,
        });

        new cdk.CfnOutput(this, CFNOutputs.GET_DB_CREDENTIALS_SECRET_ARN, {
            value: dbCredentials.secretFullArn || dbCredentials.secretArn,
        });

        new rds.DatabaseInstance(this, 'PostgreSQLInstance', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_14_4,
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T4G,
                ec2.InstanceSize.MICRO
            ),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            allocatedStorage: DATABASE.DATABASE_INSTANCE_STORAGE_SIZE,
            credentials: rds.Credentials.fromSecret(dbCredentials),
            databaseName: ResourceNames.PRIMARY_DATABASE_NAME,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // not for production environment
            securityGroups: [rdsSecurityGroup],
            // NOT FOR PROD
            publiclyAccessible: true,
        });

        // ============================================================================  //
        //                                  Pipeline
        // ============================================================================  //

        const sourceOutput = new codepipeline.Artifact();
        const cdkBuildOutput = new codepipeline.Artifact('CdkBuildOutput');

        const githubCredentials = new secretsmanager.Secret(
            this,
            'githubCredentials',
            {
                description: 'Github User credentials',
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({
                        owner: process.env.GITHUB_USERNAME,
                        repo: process.env.GITHUB_REPO_NAME,
                        branch: process.env.GITHUB_BRANCH_NAME,
                        githubToken: process.env.GITHUB_TOKEN,
                    }),
                    generateStringKey: 'secretIdentifier',
                },
            }
        );

        const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: 'PipelinePrimary',
        });

        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipeline_actions.GitHubSourceAction({
                    actionName: 'PullFromGithub',
                    output: sourceOutput, // Artifact to store the source code
                    oauthToken: cdk.SecretValue.secretsManager(
                        githubCredentials.secretArn,
                        {
                            jsonField: 'githubToken',
                        }
                    ),
                    owner: process.env.GITHUB_USERNAME as string,
                    repo: process.env.GITHUB_REPO_NAME as string,
                    branch: process.env.GITHUB_BRANCH_NAME as string,
                }),
            ],
        });

        const cdkBuild = new codebuild.PipelineProject(this, 'CdkBuild', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: ['npm install'],
                    },
                    build: {
                        commands: [
                            'npm run build',
                            'npm run test',
                            'npm run cdk synth -- -o dist',
                        ],
                    },
                },
                artifacts: {
                    'base-directory': 'dist',
                    files: ['**/*'],
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
            },
        });

        pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipeline_actions.CodeBuildAction({
                    actionName: 'CdkBuild',
                    project: cdkBuild,
                    input: sourceOutput,
                    outputs: [cdkBuildOutput],
                }),
            ],
        });

        pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipeline_actions.CloudFormationCreateUpdateStackAction({
                    actionName: 'CdkDeploy',
                    templatePath: cdkBuildOutput.atPath(
                        'ServerlessScraperStack.template.json'
                    ),
                    stackName: 'ServerlessScraperStack',
                    adminPermissions: true,
                }),
            ],
        });
    }
}
