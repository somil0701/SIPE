"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOutput = normalizeOutput;
exports.outputsMatch = outputsMatch;
exports.stringifyTestValue = stringifyTestValue;
exports.truncateOutput = truncateOutput;
function normalizeOutput(output) {
    return output.replace(/\r\n/g, '\n').trim();
}
function outputsMatch(actual, expected) {
    return normalizeOutput(actual) === normalizeOutput(expected);
}
function stringifyTestValue(value) {
    if (typeof value === 'string')
        return value;
    if (value === null || value === undefined)
        return '';
    return JSON.stringify(value);
}
function truncateOutput(value, maxLength = 4000) {
    if (value.length <= maxLength)
        return value;
    return `${value.slice(0, maxLength)}\n...[truncated]`;
}
//# sourceMappingURL=output.js.map