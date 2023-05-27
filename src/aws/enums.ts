export enum ResourceNames {
    STOCKS_TOPIC = 'stocksTopic',
    STOCKS_QUEUE = 'stocksQueue',
    GET_EARNINGS_DATA = 'getEarningsData',
    GET_MACRO_INDICATORS_DATA = 'getMacroIndicatorsData',
    SCRAPER_ROOT_WORKER = 'scraperRootWorker',
    UPSERT_LOG_STREAM = 'upsertLogStream',
    PRIMARY_DATABASE_NAME = 'primaryDatabase',
}

export enum EventNames {
    LAMBDA_CRON_TRIGGER = 'lambdaCronTrigger',
}

export enum Timeouts {
    STOCKS_QUEUE_VISIBILITY_TIMEOUT_SECONDS = 300,
    LAMBDA_TIMEOUT_MINUTES = 1,
    PAGE_NAVIGATION_TIMEOUT_MS = 80000,
    GET_MACRO_INDICATORS_DATA_TIMEOUT_MINUTES = 2,
}

export enum CloudWatch {
    WORKER_ERROR_LOG_GROUP = 'workerErrorLogGroup',
}

export enum InvocationType {
    EVENT = 'Event',
}

export enum CFNOutputs {
    GET_EARNINGS_DATA_ARN = 'getEarningsDataArn',
    GET_DB_CREDENTIALS_SECRET_ARN = 'getDbCredentialsSecretArn',
}

export const PUPPETEER_DEFAULT_PAGE_OPTIONS = {
    waitUntil: ['networkidle0', 'domcontentloaded'],
    timeout: Timeouts.PAGE_NAVIGATION_TIMEOUT_MS,
};

export enum DATABASE {
    DATABASE_INSTANCE_STORAGE_SIZE = 20,
}

/*
 * Chrome(ium) attempting to initialize GPU rendering within a VM so that browser.close() won't work. When I would specify:
 * args: [ .... , '--disable-gpu', ... ]
 * Then browser.newPage would execute immediately. However, this created a new problem for me where OpenLayers canvases wouldn't render.
 * The fix for this was specifying the GL renderer thusly:
 * args: [ ... ,'--use-gl=egl', ... ]
 * The first option might help if you're not concerned about WebGL-based elements rendering correctly, while the latter should hopefully
 * help if you need to render WebGL in a Linux VM (as Lambda is).
 */
export const PUPPETEER_DEFAULT_BROWSER_OPTIONS = [
    '--disable-dev-shm-usage',
    '--disable-crash-reporter',
    '--single-process',
    '--disable-gpu',
    '--use-gl=egl',
];

// Cron Format:
// ```cron(Minutes Hours Day-of-month Month Day-of-week Year)```
// See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
export enum Cron {
    // Every 10 minutes weekdays
    INTERVALS_OF_X_MINUTES_WEEKDAYS = 'cron(0/1 * ? * SUN-FRI *)',
    // Every Day at 18:00 weekdays
    ONCE_A_DAY_WEEKDAYS = 'cron(0 18 ? * MON-FRI *)',
}
