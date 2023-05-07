export const selectors = {
    summary: {
        header: `.symbol-page-header__name`,
        price: `.symbol-page-header__pricing-price`,
        changePercent: `.symbol-page-header__pricing-percent`,
        bid: `.symbol-page-header__pricing-bid`,
        ask: `.symbol-page-header__pricing-ask`,
        volume: `.symbol-page-header__volume`,
    },
    tables: {
        // Earnings
        earningsTableHeaderColumns: '.earnings-surprise__header > th',
        earningsTableBodyRows: '.earnings-surprise__table-body > tr',
        earningsTableCell: '.earnings-surprise__table-cell',
        earningsForecastTableHeaderColumns:
            '.earnings-forecast__section--yearly .earnings-forecast__header th',
        earningsForecastTableBodyRows:
            '.earnings-forecast__section--yearly .earnings-forecast__table-body tr',
        earningsForecastTableCell: '.earnings-forecast__cell',
        earningsForecastQuarterlyTableHeaderColumns:
            '.earnings-forecast__section--quarterly .earnings-forecast__header th',
        earningsForecastQuarterlyTableBodyRows:
            '.earnings-forecast__section--quarterly .earnings-forecast__table-body tr',
        earningsForecastQuarterlyTableCell: '.earnings-forecast__cell',

        // Financials Annual
        // Income Statement
        financialsTableHeaderColumnsIncomeStatement:
            '[data-panel-name="incomeStatementTable"] .financials__row--headings > th',
        // Each body row is (Name, Value, Value, Value) and the column headers are dates
        financialsTableBodyRowsIncomeStatement:
            '[data-panel-name="incomeStatementTable"] .financials__table-body tr',
        financialsCellIncomeStatement:
            '[data-panel-name="incomeStatementTable"] .financials__cell',

        // Balance Sheet
        financialsTableHeaderColumnsBalanceSheet:
            '[data-panel-name="balanceSheetTable"] .financials__row--headings > th',
        // Each body row is (Name, Value, Value, Value) and the column headers are dates
        financialsTableBodyRowsBalanceSheet:
            '[data-panel-name="balanceSheetTable"] .financials__table-body tr',
        financialsCellBalanceSheet:
            '[data-panel-name="balanceSheetTable"] .financials__cell',

        // Cash Flow Table
        financialsTableHeaderColumnsCashFlow:
            '[data-panel-name="cashFlowTable"] .financials__row--headings > th',
        // Each body row is (Name, Value, Value, Value) and the column headers are dates
        financialsTableBodyRowsCashFlow:
            '[data-panel-name="cashFlowTable"] .financials__table-body tr',
        financialsCellCashFlow:
            '[data-panel-name="cashFlowTable"] .financials__cell',

        // Financial Ratios Table
        financialsTableHeaderColumnsFinancialRatios:
            '[data-panel-name="financialRatiosTable"] .financials__row--headings > th',
        // Each body row is (Name, Value, Value, Value) and the column headers are dates
        financialsTableBodyRowsFinancialRatios:
            '[data-panel-name="financialRatiosTable"] .financials__table-body tr',
        financialsCellFinancialRatios:
            '[data-panel-name="financialRatiosTable"] .financials__cell',
    },
};

export const BASE_URL = 'https://www.nasdaq.com/market-activity';
