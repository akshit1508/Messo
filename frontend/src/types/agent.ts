export type AgentGoalType =
  | "INVESTIGATE_OPERATIONAL_ISSUE"
  | "INVESTIGATE_RATING_DROP"
  | "INVESTIGATE_COMPLAINT_SPIKE"
  | "REVIEW_MENU_PERFORMANCE"
  | "MENU_REPETITION_AND_STUDENT_FATIGUE";

export type AgentTriggerType = "MANUAL" | "SCHEDULED" | "ALERT";

export type AgentRunStatus =
  | "PENDING"
  | "RUNNING"
  | "WAITING_FOR_APPROVAL"
  | "APPROVED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type AgentStepStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export type AgentToolType = "READ_ONLY" | "ACTION";

export interface AgentRunResponse {
  id: number;
  goalType: AgentGoalType;
  goalTarget?: string | null;
  goalDescription?: string | null;
  triggerType: AgentTriggerType;
  status: AgentRunStatus;
  currentStepName?: string | null;
  approvalRequired: boolean;
  initiatedBy: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  finalResult?: string | null;
  actionBrief?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

export interface AgentStepResponse {
  id: number;
  runId: number;
  sequenceOrder: number;
  toolName: string;
  toolType: AgentToolType;
  status: AgentStepStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  inputSummary?: string | null;
  outputSummary?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface ProposedActionDetails {
  type: string;
  description: string;
  suggestedTarget?: string;
  actionType?: string;
  targetDate?: string;
  mealType?: string;
  currentFood?: string;
  proposedFood?: string;
}

export interface ActionBriefData {
  title: string;
  summary: string;
  observations: string[];
  evidence: string[];
  possibleFactors: string[];
  modelOutputs: string[];
  proposedAction: ProposedActionDetails;
  rationale: string;
  assumptions: string[];
  limitations: string[];
  sourceSteps: number[];
  generatedAt?: string;
  status?: string;
}

export interface ActionExecutionResponse {
  runId: number;
  status: AgentRunStatus;
  actionType: string;
  executionStatus: "EXECUTING" | "SUCCESS" | "FAILED";
  summary?: string | null;
  error?: string | null;
  result: Record<string, any>;
}

export interface AgentRecommendationResponse {
  id: number;
  agentRunId: number;
  recommendationType: string;
  title: string;
  description: string;
  suggestedTarget?: string | null;
  rationale?: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateAgentRunRequest {
  goalType: AgentGoalType;
  goalTarget?: string;
  goalDescription?: string;
}

export type AgentImplementationTaskStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "READY_FOR_VERIFICATION"
  | "COMPLETED"
  | "CANCELLED";

export interface AgentImplementationTaskResponse {
  id: number;
  agentRunId: number;
  recommendationId: number;
  title: string;
  description: string;
  reason: string;
  target: string;
  status: AgentImplementationTaskStatus;
  createdBy: string;
  createdAt: string;
  completedBy?: string | null;
  completedAt?: string | null;
  actionType?: string | null;
  targetDate?: string | null;
  mealType?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  executedAt?: string | null;
  executedBy?: string | null;
}
