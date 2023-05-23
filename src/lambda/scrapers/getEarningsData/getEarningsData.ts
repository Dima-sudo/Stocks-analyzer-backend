// @ts-ignore
import scraper from 'scraper';

import { getTableData } from './helpers/getTableData';
import { selectors, BASE_URL } from './getEarningsData.constants';
import { getFinancialsTableData } from './helpers/getFinancialsTableData';
const AWS = require('aws-sdk');

interface Response {
    summary: Record<string, string>;
    earningsQuarterlyActual: Record<string, object>;
    earningsYearlyForecasted: Record<string, object>;
    earningsQuarterlyForecasted: Record<string, object>;

    financialsIncomeStatementAnnual: Record<string, object>;
    financialsBalanceSheetAnnual: Record<string, object>;
    financialsCashFlowAnnual: Record<string, object>;
    financialsRatiosAnnual: Record<string, object>;

    financialsIncomeStatementQuarterly: Record<string, object>;
    financialsBalanceSheetQuarterly: Record<string, object>;
    financialsCashFlowQuarterly: Record<string, object>;
    financialsRatiosQuarterly: Record<string, object>;
}

exports.handler = async function (
    event: any,
    context: any,
    callback: () => void
) {
    const { log } = console;
    log('Function invoked with: ', JSON.stringify(event, undefined, 2));

    const { chromium, puppeteer } = scraper;
    console.log(event);
    const ticker = event.ticker;

    const data = {};
    let browser: any;
    let page: any;

    try {
        /*
         * Chrome(ium) attempting to initialize GPU rendering within a VM. When I would specify:
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

        await page.goto(`${BASE_URL}/stocks/${ticker}/earnings`, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 60000,
        });

        await Promise.all(
            Object.entries(selectors.summary).map(
                async ([selectorKey, selectorValue]) => {
                    const elements: string[] = await page.$$eval(
                        selectorValue,
                        (elements: HTMLElement[]) =>
                            elements.map(({ textContent }) => textContent)
                    );

                    // Because of the weird duplication in the puppeteer dom structure of the website
                    const result: string | undefined = elements.find(
                        (element: string) => element !== ''
                    );

                    if (result) {
                        // @ts-ignore
                        data[selectorKey] = result;
                    }

                    return result || null;
                }
            )
        );

        const {
            tables: {
                earningsTableHeaderColumns,
                earningsTableBodyRows,
                earningsTableCell,

                earningsForecastTableHeaderColumns,
                earningsForecastTableBodyRows,
                earningsForecastTableCell,

                earningsForecastQuarterlyTableHeaderColumns,
                earningsForecastQuarterlyTableBodyRows,
                earningsForecastQuarterlyTableCell,

                financialsTableHeaderColumnsIncomeStatement,
                financialsTableBodyRowsIncomeStatement,

                financialsTableHeaderColumnsBalanceSheet,
                financialsTableBodyRowsBalanceSheet,

                financialsTableHeaderColumnsCashFlow,
                financialsTableBodyRowsCashFlow,

                financialsTableHeaderColumnsFinancialRatios,
                financialsTableBodyRowsFinancialRatios,
            },
            // button: { annualQuarterlyDropdownButton },
            // singleSelect: { financialsOptionAnnual, financialsOptionQuarterly },
        } = selectors;

        const earningsQuarterlyActual = await getTableData({
            pageInstance: page,
            tableHeaderColumns: earningsTableHeaderColumns,
            tableBodyRows: earningsTableBodyRows,
            tableCell: earningsTableCell,
        });

        const earningsYearlyForecasted = await getTableData({
            pageInstance: page,
            tableHeaderColumns: earningsForecastTableHeaderColumns,
            tableBodyRows: earningsForecastTableBodyRows,
            tableCell: earningsForecastTableCell,
        });

        const earningsQuarterlyForecasted = await getTableData({
            pageInstance: page,
            tableHeaderColumns: earningsForecastQuarterlyTableHeaderColumns,
            tableBodyRows: earningsForecastQuarterlyTableBodyRows,
            tableCell: earningsForecastQuarterlyTableCell,
        });

        await page.goto(`${BASE_URL}/stocks/${ticker}/financials`, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 60000,
        });

        const financialsIncomeStatementAnnual = await getFinancialsTableData({
            pageInstance: page,
            tableHeaderColumns: financialsTableHeaderColumnsIncomeStatement,
            tableBodyRows: financialsTableBodyRowsIncomeStatement,
        });

        const financialsBalanceSheetAnnual = await getFinancialsTableData({
            pageInstance: page,
            tableHeaderColumns: financialsTableHeaderColumnsBalanceSheet,
            tableBodyRows: financialsTableBodyRowsBalanceSheet,
        });

        const financialsCashFlowAnnual = await getFinancialsTableData({
            pageInstance: page,
            tableHeaderColumns: financialsTableHeaderColumnsCashFlow,
            tableBodyRows: financialsTableBodyRowsCashFlow,
        });

        const financialsRatiosAnnual = await getFinancialsTableData({
            pageInstance: page,
            tableHeaderColumns: financialsTableHeaderColumnsFinancialRatios,
            tableBodyRows: financialsTableBodyRowsFinancialRatios,
        });

        // Wait for the annualQuarterlyDropdownButton to appear
        await page.waitForSelector(
            selectors.button.annualQuarterlyDropdownButton
        );

        // Scroll the button into view and click it
        await page.$eval(
            selectors.button.annualQuarterlyDropdownButton,
            (button: any) => {
                button.scrollIntoView();
                button.click();
            }
        );

        // Wait a bit to make sure the dropdown has appeared
        await page.waitForTimeout(500);

        // Wait for the financialsOptionQuarterly option to appear
        await page.waitForSelector(
            selectors.singleSelect.financialsOptionQuarterly
        );

        // Scroll the option into view and click it
        await page.$eval(
            selectors.singleSelect.financialsOptionQuarterly,
            (option: any) => {
                option.scrollIntoView();
                option.click();
            }
        );

        // Wait a bit to make sure the dropdown has appeared
        await page.waitForTimeout(500);

        const financialsIncomeStatementQuarterly = await getFinancialsTableData(
            {
                pageInstance: page,
                tableHeaderColumns: financialsTableHeaderColumnsIncomeStatement,
                tableBodyRows: financialsTableBodyRowsIncomeStatement,
            }
        );

        const financialsBalanceSheetQuarterly = await getFinancialsTableData({
            pageInstance: page,
            tableHeaderColumns: financialsTableHeaderColumnsBalanceSheet,
            tableBodyRows: financialsTableBodyRowsBalanceSheet,
        });

        const financialsCashFlowQuarterly = await getFinancialsTableData({
            pageInstance: page,
            tableHeaderColumns: financialsTableHeaderColumnsCashFlow,
            tableBodyRows: financialsTableBodyRowsCashFlow,
        });

        const financialsRatiosQuarterly = await getFinancialsTableData({
            pageInstance: page,
            tableHeaderColumns: financialsTableHeaderColumnsFinancialRatios,
            tableBodyRows: financialsTableBodyRowsFinancialRatios,
        });

        const res = {
            summary: { ...data },
            earningsQuarterlyActual,
            earningsYearlyForecasted,
            earningsQuarterlyForecasted,

            financialsIncomeStatementAnnual,
            financialsBalanceSheetAnnual,
            financialsCashFlowAnnual,
            financialsRatiosAnnual,

            financialsIncomeStatementQuarterly,
            financialsBalanceSheetQuarterly,
            financialsCashFlowQuarterly,
            financialsRatiosQuarterly,
        };

        const sqs = new AWS.SQS();
        const params = {
            QueueUrl: process.env.QUEUE_URL, // Access the QUEUE_URL environment variable
            MessageBody: JSON.stringify(res),
            MessageGroupId: 'scraperCompanyResultsMessageGroup', // Replace with your Message Group ID
        };

        sqs.sendMessage(params, (err: any, data: any) => {
            if (err) {
                console.error('Error', err);
            } else {
                console.log('Success', data.MessageId);
            }
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: res,
        };
    } catch (error: any) {
        throw new Error(error);
    } finally {
        await page.close();
        await browser.close();
    }
};
