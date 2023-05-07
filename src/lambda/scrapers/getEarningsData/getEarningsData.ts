// @ts-ignore
import scraper from 'scraper';

import { getTableData } from './helpers/getTableData';
import { selectors, BASE_URL } from './getEarningsData.constants';
import { getFinancialsTableData } from './helpers/getFinancialsTableData';

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
    let browser;

    try {
        browser = await puppeteer.launch({
            args: [...chromium.args, '--disable-dev-shm-usage'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        const page = await browser.newPage();

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
                financialsCellIncomeStatement,

                financialsTableHeaderColumnsBalanceSheet,
                financialsTableBodyRowsBalanceSheet,
                financialsCellBalanceSheet,

                financialsTableHeaderColumnsCashFlow,
                financialsTableBodyRowsCashFlow,
                financialsCellCashFlow,

                financialsTableHeaderColumnsFinancialRatios,
                financialsTableBodyRowsFinancialRatios,
                financialsCellFinancialRatios,
            },
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

        const res = {
            summary: { ...data },
            earningsQuarterlyActual,
            earningsYearlyForecasted,
            earningsQuarterlyForecasted,

            financialsIncomeStatementAnnual,
            financialsBalanceSheetAnnual,
            financialsCashFlowAnnual,
            financialsRatiosAnnual,
        };

        console.log('Response: ');
        console.log(res);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: res,
        };
    } catch (error: any) {
        throw new Error(error);
    }
};
