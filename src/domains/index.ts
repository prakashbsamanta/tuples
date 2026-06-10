export type Phase = 'Novice' | 'Operator' | 'Architect' | 'Principal' | 'Capstone';

export type ChallengeType = 'write' | 'fix' | 'optimize' | 'open';

export type Validation =
  | { type: 'RESULT_MATCH'; solutionQuery: string; requiresOrder?: boolean }
  | { type: 'SCHEMA_VERIFY'; verificationQuery: string; expectedResult: string }
  | { type: 'STATE_VERIFY'; verificationQuery: string; expectedResult: string }
  | { type: 'PLAN_VERIFY'; solutionQuery: string; planMustInclude: string };

export interface DomainStep {
  stepIndex: number;
  phase: Phase;
  conceptFocus: string;
  narrativeBriefing: string;
  /** Defaults to 'write'. 'fix'/'optimize' pre-fill the editor with starterQuery. */
  challengeType?: ChallengeType;
  starterQuery?: string;
  hints: {
    tier1Concept: string;
    tier2Scaffold: string;
    tier3Solution: string;
  };
  validation: Validation;
  /**
   * Whether the canonical solution changes DB state. Defaults to true for
   * SCHEMA_VERIFY/STATE_VERIFY, false otherwise. Set explicitly for
   * RESULT_MATCH/PLAN_VERIFY steps whose solution mutates (e.g. CREATE INDEX).
   */
  mutates?: boolean;
  /** Key into seedScripts — bulk data loaded after this step passes. */
  seedAfter?: string;
}

export interface ExamQuestion {
  prompt: string;
  conceptFocus: string;
  solutionQuery: string;
  requiresOrder?: boolean;
}

export interface DomainSchema {
  domainId: string;
  domainName: string;
  domainDescription: string;
  /** Seed script run when the mission DB is created (pre-populated missions). */
  setupSeedKey?: string;
  curriculumMatrix: DomainStep[];
  examPool: ExamQuestion[];
}

import clinicalTrials from './clinical_trials.json';
import algorithmicTrading from './algorithmic_trading.json';
import spaceLogistics from './space_logistics.json';

export const domains: Record<string, DomainSchema> = {
  [clinicalTrials.domainId]: clinicalTrials as unknown as DomainSchema,
  [algorithmicTrading.domainId]: algorithmicTrading as unknown as DomainSchema,
  [spaceLogistics.domainId]: spaceLogistics as unknown as DomainSchema,
};
