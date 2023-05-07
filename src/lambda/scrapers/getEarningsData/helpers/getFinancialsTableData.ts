import { Page } from 'puppeteer-core';
import { plainTextToCamelCase } from 'src/utils/plainTextToCamelCase';

interface ITableProps {
    pageInstance: Page;
    tableHeaderColumns: string;
    tableBodyRows: string;
}

export const getFinancialsTableData = async ({
    pageInstance,
    tableHeaderColumns,
    tableBodyRows,
}: ITableProps) => {
    try {
        const columnNames = await pageInstance.$$eval(
            tableHeaderColumns,
            (elements) =>
                // @ts-ignore
                elements.map(({ textContent }: HTMLElement) => textContent)
        );

        // The first row element is a comment cell (e.g Period Ending) and not a date
        columnNames.shift();
        //

        const rowNames = await pageInstance.$$eval(tableBodyRows, (rows) => {
            // @TODO This is voodoo, should re-write the flatMap to be more elegant
            return rows.flatMap((row) =>
                Array.from(row.querySelectorAll('th')).map((cell: any) =>
                    cell.textContent.trim()
                )
            );
        });

        const rows = await pageInstance.$$eval(tableBodyRows, (rows) => {
            return rows.map((row) =>
                Array.from(row.querySelectorAll('td')).map((cell: any) =>
                    cell.textContent.trim()
                )
            );
        });

        const data = {};

        // @ts-ignore
        columnNames.forEach((columnName: string, i) => {
            const columnKeyValues: Record<string, any> = {};
            rows.forEach((row: string[], j) => {
                const rowValue = row[i];
                const rowName = rowNames[j];

                // @ts-ignore
                columnKeyValues[plainTextToCamelCase(rowName)] = rowValue;
            });

            // @ts-ignore
            data[plainTextToCamelCase(columnName)] = columnKeyValues;
        });

        return data;
    } catch (error: any) {
        throw new Error(error);
    }
};
