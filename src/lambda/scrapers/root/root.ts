import * as AWS from 'aws-sdk';
import { tickers } from './root.constants';
import { CFNOutputs, InvocationType } from 'src/aws/enums';

exports.handler = async function (
    event: any,
    context: any,
    callback: () => void
) {
    try {
        const { log } = console;
        log('Function invoked with: ', JSON.stringify(event, undefined, 2));

        const lambda = new AWS.Lambda();

        // await Promise.all(
        //     tickers.map(async (ticker) => {
        for (let ticker of tickers) {
            const cloudFormation = new AWS.CloudFormation();

            const stackName = process.env.STACK_NAME;

            const data = await cloudFormation
                .describeStacks({ StackName: stackName })
                .promise();

            //@ts-ignore
            const outputs = data.Stacks[0].Outputs;
            //@ts-ignore
            const functionArn = outputs?.find(
                (o) => o?.OutputKey === CFNOutputs.GET_EARNINGS_DATA_ARN
            ).OutputValue;

            const params = {
                FunctionName: functionArn as string,
                InvocationType: InvocationType.EVENT,
                LogType: 'None',
                Payload: JSON.stringify({
                    ticker,
                }),
            };
            console.log(params);

            log(`Invoking lambda for ticker ${ticker}`);

            await lambda.invoke(params).promise();
        }
        //     })
        // );

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Function executed successfully',
        };
    } catch (err: any) {
        throw new Error(err);
    }
};
