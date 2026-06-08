export interface DomainStep {
  stepIndex: number;
  phase: "Novice" | "Operator" | "Architect";
  conceptFocus: string;
  narrativeBriefing: string;
  hints: {
    tier1Concept: string;
    tier2Scaffold: string;
    tier3Solution: string;
  };
  validationType: "OUTPUT_MATCH" | "SCHEMA_VERIFY" | "ROW_COUNT_VERIFY";
  verificationQuery: string;
  expectedResult: string;
}

export interface DomainSchema {
  domainId: string;
  domainName: string;
  domainDescription: string;
  curriculumMatrix: DomainStep[];
}

import clinicalTrials from './clinical_trials.json';
import algorithmicTrading from './algorithmic_trading.json';
import spaceLogistics from './space_logistics.json';

// Define a map of all available domains
export const domains: Record<string, DomainSchema> = {
  [clinicalTrials.domainId]: clinicalTrials as DomainSchema,
  [algorithmicTrading.domainId]: algorithmicTrading as DomainSchema,
  [spaceLogistics.domainId]: spaceLogistics as DomainSchema,
};
