import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { ApplicationStage } from './ApplicationStage';
// import { ApplicationStage } from './ApplicationStage';
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

        // const adminRole = new iam.Role(this, 'CICDRole', {
        //     assumedBy: new iam.CompositePrincipal(
        //         new iam.ServicePrincipal('codebuild.amazonaws.com'),
        //         new iam.ServicePrincipal('codedeploy.amazonaws.com'),
        //         new iam.ServicePrincipal('codepipeline.amazonaws.com')
        //     ),
        // });

        // adminRole.addToPolicy(
        //     new iam.PolicyStatement({
        //         effect: iam.Effect.ALLOW,
        //         resources: ['*'],
        //         actions: [
        //             'secretsmanager:GetSecretValue',
        //             'secretsmanager:DescribeSecret',
        //         ],
        //     })
        // );
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

        const adminRole = new iam.Role(this, 'PipelineRole', {
            assumedBy: new iam.CompositePrincipal(
                new iam.ServicePrincipal('codebuild.amazonaws.com'),
                new iam.ServicePrincipal('codepipeline.amazonaws.com'),
                new iam.ServicePrincipal('codedeploy.amazonaws.com')
            ),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'AdministratorAccess'
                ),
            ],
        });

        const policy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['*'],
            resources: ['*'],
        });

        adminRole.addToPolicy(policy);

        const source = pipelines.CodePipelineSource.gitHub(
            `${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO_NAME}`,
            process.env.GITHUB_BRANCH_NAME as string,
            {
                authentication: cdk.SecretValue.secretsManager(
                    githubCredentials.secretFullArn ||
                        githubCredentials.secretArn,
                    { jsonField: 'githubToken' }
                ),
            }
        );

        const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
            pipelineName: 'PipelinePrimary',
            synth: new pipelines.ShellStep('Synth', {
                input: source,
                commands: ['npm ci', 'npm run build', 'npx cdk synth'],
                primaryOutputDirectory: 'cdk.out',
            }),
            selfMutation: true,
            role: adminRole,
        });

        pipeline.addStage(new ApplicationStage(this, 'dev'));
    }
}
