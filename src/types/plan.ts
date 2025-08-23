export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  metadata?: Record<string, any>;
}

export interface PlanStep {
  id: string;
  description: string;
  type: PlanStepType;
  dependencies?: string[];
  estimatedEffort?: string;
  subSteps?: PlanStep[];
}

export enum PlanStepType {
  ANALYSIS = 'ANALYSIS',
  IMPLEMENTATION = 'IMPLEMENTATION',
  TESTING = 'TESTING',
  REFACTORING = 'REFACTORING',
  DOCUMENTATION = 'DOCUMENTATION',
  OTHER = 'OTHER'
}

export interface CodebaseSummary {
  files: string[];
  components: string[];
  technologies: string[];
  dependencies: string[];
}

export interface PlanGenerationRequest {
  requirement: string;
  codebase: CodebaseSummary;
}
