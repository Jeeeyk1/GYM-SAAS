/**
 * Subscription plan limits — single source of truth.
 *
 * Change numbers here only. Services and guards import PLAN_LIMITS;
 * nothing else should hardcode these values.
 *
 * -1 = unlimited (enforced as: if limit === -1, skip count check)
 */
export const PLAN_LIMITS = {
  basic: {
    maxMembers: 100,
    maxBranches: 1,
    aiTokenLimit: 0,
  },
  advanced: {
    maxMembers: 500,
    maxBranches: 3,
    aiTokenLimit: 100_000,
  },
  enterprise: {
    maxMembers: -1,
    maxBranches: -1,
    aiTokenLimit: 1_000_000,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanLimitKey = keyof (typeof PLAN_LIMITS)[PlanName];
