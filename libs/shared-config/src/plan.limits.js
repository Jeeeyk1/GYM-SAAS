"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = void 0;
exports.PLAN_LIMITS = {
    basic: { maxMembers: 100, maxBranches: 1, aiTokenLimit: 0 },
    advanced: { maxMembers: 500, maxBranches: 3, aiTokenLimit: 100000 },
    enterprise: { maxMembers: -1, maxBranches: -1, aiTokenLimit: 1000000 },
};
//# sourceMappingURL=plan.limits.js.map
