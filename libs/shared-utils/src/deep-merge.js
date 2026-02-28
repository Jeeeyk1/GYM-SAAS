"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepMerge = deepMerge;
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        const sourceVal = source[key];
        const targetVal = result[key];
        if (sourceVal !== null &&
            typeof sourceVal === 'object' &&
            !Array.isArray(sourceVal) &&
            targetVal !== null &&
            typeof targetVal === 'object' &&
            !Array.isArray(targetVal)) {
            result[key] = deepMerge(targetVal, sourceVal);
        }
        else if (sourceVal !== undefined) {
            result[key] = sourceVal;
        }
    }
    return result;
}
//# sourceMappingURL=deep-merge.js.map