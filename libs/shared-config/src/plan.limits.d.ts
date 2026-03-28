export declare const PLAN_LIMITS: {
    readonly basic: { readonly maxMembers: 100; readonly maxBranches: 1; readonly aiTokenLimit: 0; };
    readonly advanced: { readonly maxMembers: 500; readonly maxBranches: 3; readonly aiTokenLimit: 100000; };
    readonly enterprise: { readonly maxMembers: -1; readonly maxBranches: -1; readonly aiTokenLimit: 1000000; };
};
export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanLimitKey = keyof (typeof PLAN_LIMITS)[PlanName];
