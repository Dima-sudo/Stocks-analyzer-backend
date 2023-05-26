import { plainTextToCamelCase } from 'src/utils/plainTextToCamelCase';

export const cleanSpacesAndLineBreaks = (str: string) => {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }

    const cleanedString = str.replaceAll(/\n/gi, '').trim();

    return cleanedString;
};

type DataRow = string[];
type DataObject = { [key: string]: { [key: string]: string } };

export const buildDataObjectFromTable = (
    rows: DataRow[],
    columns: string[]
) => {
    const dataObject: DataObject = {};

    rows.forEach((row) => {
        const key = plainTextToCamelCase(row.shift() || '');
        const valuesObject: { [key: string]: string } = {};

        columns.forEach((column, index) => {
            valuesObject[plainTextToCamelCase(column)] = row[index];
        });

        dataObject[key] = valuesObject;
    });

    return dataObject;
};
