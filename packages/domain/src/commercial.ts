import { RuleError } from "./rules";

const decisions = ["proceed", "revise", "defer", "stop"] as const;
const strategies = ["operating", "licensing_or_sale", "defensive"] as const;

export type CommercialDecision = (typeof decisions)[number];
export type CommercialStrategy = (typeof strategies)[number];

export interface CommercialInput {
  buyer: string | null;
  substitute: string | null;
  evidenceRequest: string | null;
  strategy: string;
  decision: string;
  productRevenueMicrousd: string | null;
  productCostMicrousd: string | null;
  patentCostMicrousd: string | null;
  marketSizeMicrousd: string | null;
  licensingProbability: string | null;
}

export interface CommercialRecord {
  decision: CommercialDecision;
  strategy: CommercialStrategy;
  productCashflowMicrousd: string | null;
  incrementalPatentValueMicrousd: null;
  unknowns: string[];
  erasesEngineering: false;
}

function money(value: string | null): bigint | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  if (!/^\d+$/.test(text)) throw new RuleError("money must be a whole micro-USD amount");
  return BigInt(text);
}

export function assessCommercial(input: CommercialInput): CommercialRecord {
  if (input.licensingProbability?.trim()) {
    throw new RuleError("unsupported licensing probability");
  }
  if (input.marketSizeMicrousd?.trim()) {
    throw new RuleError("market size stays unknown without a sourced series");
  }
  if (!decisions.includes(input.decision as CommercialDecision)) {
    throw new RuleError("commercial decision must be proceed, revise, defer, or stop");
  }
  if (!strategies.includes(input.strategy as CommercialStrategy)) {
    throw new RuleError("unknown commercial strategy");
  }
  const unknowns = ["market_size", "incremental_patent_value"];
  if (!input.buyer?.trim()) unknowns.push("buyer");
  const revenue = money(input.productRevenueMicrousd);
  const cost = money(input.productCostMicrousd);
  money(input.patentCostMicrousd);
  if (revenue === null || cost === null) unknowns.push("product_cashflow");
  return {
    decision: input.decision as CommercialDecision,
    strategy: input.strategy as CommercialStrategy,
    productCashflowMicrousd: revenue === null || cost === null ? null : (revenue - cost).toString(),
    incrementalPatentValueMicrousd: null,
    unknowns,
    erasesEngineering: false,
  };
}
