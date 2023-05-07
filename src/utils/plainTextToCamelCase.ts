import { capitalize } from './capitalize';

export const plainTextToCamelCase = (plainText: string): string => {
    if (
        plainText == null ||
        plainText.trim() === '' ||
        typeof plainText === 'undefined'
    ) {
        return '';
    }

    const cleanedPlainText = plainText
        .replaceAll(/\%/gi, 'Percent')
        .replaceAll(/\@/gi, 'At')
        .replaceAll(/\&/gi, 'And')
        .replaceAll(/\+/gi, 'Plus')
        .replaceAll(/\=/gi, 'Equals')
        .replaceAll(/\*/gi, ' ')
        .replaceAll(/\$/gi, ' ')
        .replaceAll(/\(/gi, ' ')
        .replaceAll(/\)/gi, ' ')
        .replaceAll(/\-/gi, ' ')
        .replaceAll(/\#/gi, ' ')
        .replaceAll(/\!/gi, ' ')
        .replaceAll(/\?/gi, ' ')
        .replaceAll(/\,/gi, ' ')
        .replaceAll(/\:/gi, ' ')
        .replaceAll(/\;/gi, ' ')
        .replaceAll(/\'/gi, ' ')
        .replaceAll(/\[/gi, ' ')
        .replaceAll(/\]/gi, ' ')
        .replaceAll(/\^/gi, ' ')
        .replaceAll(/\_/gi, ' ')
        .replaceAll(/\|/gi, ' ')
        .replaceAll(/\{/gi, ' ')
        .replaceAll(/\}/gi, ' ')
        .replaceAll(/\</gi, ' ')
        .replaceAll(/\>/gi, ' ')
        .replaceAll(/\~/gi, ' ');

    const pascalCase = cleanedPlainText
        .split(' ')
        .map((word) =>
            word && word !== ' ' ? capitalize(word.toLowerCase()) : ''
        );
    const firstWord = pascalCase[0].toLowerCase();

    pascalCase[0] = firstWord;

    const camelCase = pascalCase.join('');

    return camelCase;
};
