export enum ResourceNames {
    STOCKS_TOPIC = 'stocksTopic',
    STOCKS_QUEUE = 'stocksQueue',
    GET_EARNINGS_DATA = 'getEarningsData',
    SCRAPER_ROOT_WORKER = 'scraperRootWorker',
    UPSERT_LOG_STREAM = 'upsertLogStream',
}

export enum EventNames {
    LAMBDA_CRON_TRIGGER = 'lambdaCronTrigger',
}

export enum Timeouts {
    STOCKS_QUEUE_VISIBILITY_TIMEOUT_SECONDS = 300,
    LAMBDA_TIMEOUT_MINUTES = 1,
}

export enum CloudWatch {
    WORKER_ERROR_LOG_GROUP = 'workerErrorLogGroup',
}

// Cron Format:
// ```cron(Minutes Hours Day-of-month Month Day-of-week Year)```
// See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
export enum Cron {
    // Every 10 minutes weekdays
    INTERVALS_OF_X_MINUTES_WEEKDAYS = 'cron(0/1 * ? * SUN-FRI *)',
    // Every Day at 18:00 weekdays
    ONCE_A_DAY_WEEKDAYS = 'cron(0 18 ? * MON-FRI *)',
}
