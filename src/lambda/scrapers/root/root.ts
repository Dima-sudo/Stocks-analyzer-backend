import { ResourceNames, CloudWatch } from './../../../aws/enums';
import * as AWS from 'aws-sdk';
import { tickers } from './root.constants';

exports.handler = async function (
    event: any,
    context: any,
    callback: () => void
) {
    try {
        const { log } = console;
        log('Function invoked with: ', JSON.stringify(event, undefined, 2));
        const ipAddress = event.requestContext.identity.sourceIp;
        log(ipAddress);

        const lambda = new AWS.Lambda();

        await Promise.all(
            tickers.map(async (ticker) => {
                const params = {
                    // FunctionName: ResourceNames.GET_EARNINGS_DATA,
                    FunctionName:
                        // This is a placeholder, the arn for the function through the stack is different than the actual arn.
                        // @TODO access this field programmatically
                        'arn:aws:lambda:eu-west-1:295594749891:function:ServerlessScraperStack-GetEarningsDataB158A8BD-KLqElYrwlVvC',
                    InvocationType: 'Event',
                    LogType: 'None',
                    Payload: JSON.stringify({
                        ticker,
                    }),
                };
                log(`Invoking lambda for ticker ${ticker}`);

                await lambda.invoke(params).promise();
            })
        );

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Function executed successfully',
        };
    } catch (err: any) {
        throw new Error(err);
    }
};
