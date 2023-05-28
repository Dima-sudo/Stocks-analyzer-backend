import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

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

        const source = pipelines.CodePipelineSource.gitHub(
            `${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO_NAME}`,
            process.env.GITHUB_BRANCH_NAME as string,
            {
                authentication: cdk.SecretValue.secretsManager(
                    'arn:aws:secretsmanager:eu-west-1:295594749891:secret:DbCredentials798065DE-U8gjQdJB2oto-00VrgP',
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
        });

        pipeline.addStage(new ApplicationStage(this, 'dev'));
    }
}
