import { WebClient } from '@slack/web-api';

export const sendSlackMessage = async (
    message: string,
    client: WebClient,
    ch?: string
) => {
    const channel = ch || '#logs-general';

    return client.chat.postMessage({
        channel: channel,
        text: message,
    });
};
