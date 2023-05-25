// @ts-ignore
import scraper from 'scraper';
import { PUPPETEER_DEFAULT_PAGE_OPTIONS } from 'src/aws/enums';
import { selectors } from './getMacroIndicatorsData.constants';
import { Page } from 'puppeteer-core';
import { Browser } from 'puppeteer-core';
import { PuppeteerLifeCycleEvent } from 'puppeteer-core';

exports.handler = async function (
    event: any,
    context: any,
    callback: () => void
) {
    const { log } = console;
    log('Function invoked with: ', JSON.stringify(event, undefined, 2));

    const { chromium, puppeteer } = scraper;

    let browser: Browser;
    let page: Page;
    try {
        /*
         * Chrome(ium) attempting to initialize GPU rendering within a VM so that browser.close() won't work. When I would specify:
         * args: [ .... , '--disable-gpu', ... ]
         * Then browser.newPage would execute immediately. However, this created a new problem for me where OpenLayers canvases wouldn't render.
         * The fix for this was specifying the GL renderer thusly:
         * args: [ ... ,'--use-gl=egl', ... ]
         * The first option might help if you're not concerned about WebGL-based elements rendering correctly, while the latter should hopefully
         * help if you need to render WebGL in a Linux VM (as Lambda is).
         */
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-dev-shm-usage',
                '--disable-crash-reporter',
                '--single-process',
                '--disable-gpu',
                '--use-gl=egl',
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        page = await browser.newPage();

        await page.goto(
            'https://https://tradingeconomics.com/united-states/indicators',
            PUPPETEER_DEFAULT_PAGE_OPTIONS as {
                timeout: number;
                waitUntil: PuppeteerLifeCycleEvent[] | undefined;
            }
        );

        console.log(page.content());

        const { indicatorsTableRows } = selectors;
        const elements = await page.$$eval(indicatorsTableRows, () => {});
    } catch (error: any) {
        throw new Error(error);
    } finally {
        // @ts-ignore
        await page.close();
        // @ts-ignore
        await browser.close();
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello World',
        }),
    };
};
