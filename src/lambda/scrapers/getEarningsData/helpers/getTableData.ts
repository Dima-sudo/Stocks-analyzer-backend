import { Page } from 'puppeteer-core';
import { plainTextToCamelCase } from 'src/utils/plainTextToCamelCase';

interface ITableProps {
    pageInstance: Page;
    tableHeaderColumns: string;
    tableBodyRows: string;
    tableCell: string;
}

export const getTableData = async ({
    pageInstance,
    tableHeaderColumns,
    tableBodyRows,
    tableCell,
}: ITableProps) => {
    try {
        const columnNames = await pageInstance.$$eval(
            tableHeaderColumns,
            (elements) =>
                // @ts-ignore
                elements.map(({ textContent }: HTMLElement) => textContent)
        );

        const rows = await pageInstance.$$(tableBodyRows);
        const TABLE_CELL_SELECTOR = tableCell;

        const data = {};

        await Promise.all(
            rows.map(async (row: Record<any, any>) => {
                const rowValues = await row.$$eval(
                    TABLE_CELL_SELECTOR,
                    (elements: HTMLElement[]) =>
                        elements.map(
                            ({ textContent }: HTMLElement) => textContent
                        )
                );

                const earningsReport = {};

                rowValues.map((value: string, i: number) => {
                    const columnName = columnNames[i];
                    if (columnName) {
                        // @ts-ignore
                        earningsReport[plainTextToCamelCase(columnName)] =
                            value;
                    }
                });

                const earningsDate = plainTextToCamelCase(rowValues[0]);
                // @ts-ignore
                data[earningsDate] = earningsReport;
            })
        );

        return data;
    } catch (error: any) {
        throw new Error(error);
    }
};
