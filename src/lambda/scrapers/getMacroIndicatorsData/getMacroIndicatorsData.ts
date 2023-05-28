// @ts-ignore
import scraper from 'scraper';
import {
    PUPPETEER_DEFAULT_BROWSER_OPTIONS,
    PUPPETEER_DEFAULT_PAGE_OPTIONS,
} from 'src/aws/enums';
import {
    INDICATOR_COLUMNS,
    MACRO_INDICATORS_URL,
    selectors,
} from './getMacroIndicatorsData.constants';
import { Page } from 'puppeteer-core';
import { Browser } from 'puppeteer-core';
import { PuppeteerLifeCycleEvent } from 'puppeteer-core';
import {
    buildDataObjectFromTable,
    cleanSpacesAndLineBreaks,
} from './getMacroIndicatorsData.util';

exports.handler = async function (event: any) {
    const { log } = console;

    log('Function invoked with: ', JSON.stringify(event, undefined, 2));

    const { chromium, puppeteer } = scraper;

    let browser: Browser;
    let page: Page;
    try {
        console.log('SEQUELIZE BEFORE');
        console.log('SEQUELIZE AFTER');

        browser = await puppeteer.launch({
            args: [...chromium.args, ...PUPPETEER_DEFAULT_BROWSER_OPTIONS],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        page = await browser.newPage();

        await page.goto(
            MACRO_INDICATORS_URL,
            PUPPETEER_DEFAULT_PAGE_OPTIONS as {
                timeout: number;
                waitUntil: PuppeteerLifeCycleEvent[] | undefined;
            }
        );

        const { indicatorsTableRows } = selectors;
        const elements = await page.$$eval(indicatorsTableRows, (rows) => {
            return rows.map((row) => {
                const columns = row.querySelectorAll('td');
                // Can't clean the textContent here because $$eval expects browser context which doesn't
                // have access to the node.js scope
                return Array.from(columns, (column: any) => column.textContent);
            });
        });

        const formattedElements = elements.map((row) => {
            return row.map((columnText) =>
                cleanSpacesAndLineBreaks(columnText || '')
            );
        });

        const data = buildDataObjectFromTable(
            formattedElements,
            INDICATOR_COLUMNS
        );

        console.log('data:');
        console.log(data);

        return {
            statusCode: 200,
            body: JSON.stringify({
                data,
            }),
        };
    } catch (error: any) {
        throw new Error(error);
    } finally {
        // @ts-ignore
        await page.close();
        // @ts-ignore
        await browser.close();
    }
};
