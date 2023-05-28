import { CloudWatchLogs } from 'aws-sdk';
import { WebClient } from '@slack/web-api';
import { sendSlackMessage } from 'src/services/slack/sendSlackMessage';

const cloudWatchLogs = new CloudWatchLogs();
const slackClient = new WebClient(process.env.SLACK_API_BOT_TOKEN);

interface CloudWatchLogEvent {
    logGroupName: string;
    logStreamName: string;
    logEvent: string;
}

exports.handler = async function upsertLogStream(event: CloudWatchLogEvent) {
    console.log('SLACK API');
    console.log(process.env.SLACK_API_BOT_TOKEN);
    const { logGroupName, logStreamName, logEvent } = event;
    try {
        throw new Error(
            'Testing throwing an error for sending a slack message'
        );
        // Check if the log group exists
        const describeLogGroupsParams = {
            logGroupNamePrefix: logGroupName,
        };
        const describeLogGroupsResult = await cloudWatchLogs
            .describeLogGroups(describeLogGroupsParams)
            .promise();
        const logGroupExists =
            describeLogGroupsResult.logGroups?.find(
                (logGroup) => logGroup.logGroupName === logGroupName
            ) !== undefined;

        // If the log group doesn't exist, create it
        if (!logGroupExists) {
            const createLogGroupParams = {
                logGroupName: logGroupName,
            };
            await cloudWatchLogs.createLogGroup(createLogGroupParams).promise();
        }

        // Check if the log stream exists
        const describeLogStreamsParams = {
            logGroupName: logGroupName,
            logStreamNamePrefix: logStreamName,
        };

        const describeLogStreamsResult = await cloudWatchLogs
            .describeLogStreams(describeLogStreamsParams)
            .promise();
        const logStreamExists =
            describeLogStreamsResult.logStreams?.find(
                (logStream) => logStream.logStreamName === logStreamName
            ) !== undefined;

        // If the log stream doesn't exist, create it
        if (!logStreamExists) {
            const createLogStreamParams = {
                logGroupName: logGroupName,
                logStreamName: logStreamName,
            };
            await cloudWatchLogs
                .createLogStream(createLogStreamParams)
                .promise();
        }

        // Put the log event into the log stream
        const putLogEventsParams = {
            logGroupName: logGroupName,
            logStreamName: logStreamName,
            logEvents: [
                {
                    message: logEvent,
                    timestamp: Date.now(),
                },
            ],
        };

        await cloudWatchLogs.putLogEvents(putLogEventsParams).promise();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: `Event ${JSON.stringify(event)} was successfully processed`,
        };
    } catch (err) {
        console.log('Error reached in upsertLogStream');
        console.error(err);
        try {
            await sendSlackMessage(
                'Testing slack messaging in general',
                slackClient,
                '#general'
            );
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'text/plain' },
                body: `Slack message sent in upsertLogStream with invocation event ${JSON.stringify(
                    event
                )}`,
            };
        } catch (err: any) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'text/plain' },
                body: `Final catch block: Failed sending a slack message in upsertLogStream with invocation event: ${JSON.stringify(
                    event
                )} and \n error: ${new Error(err).toString()}`,
            };
        }
    }
};

// {
//     "logGroupName": "custom-errors";
//     "logStreamName": "test-stream";
//     "logEvent": "This is a test event in the stream";
// }
