import { request } from "./api";
import {
  AgentRunResponse,
  AgentStepResponse,
  CreateAgentRunRequest,
  ActionExecutionResponse,
  AgentRecommendationResponse,
} from "@/types/agent";

/**
 * Client for MESO AI Operations Agent endpoints.
 * All requests route via Spring Boot API (/api/admin/agent/*).
 * Authentication via existing session cookies + CSRF tokens.
 */

export async function createAgentRun(
  data: CreateAgentRunRequest
): Promise<AgentRunResponse> {
  return request<AgentRunResponse>("/api/admin/agent/runs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAgentRuns(): Promise<AgentRunResponse[]> {
  return request<AgentRunResponse[]>("/api/admin/agent/runs", {
    method: "GET",
  });
}

export async function getAgentRun(id: number): Promise<AgentRunResponse> {
  return request<AgentRunResponse>(`/api/admin/agent/runs/${id}`, {
    method: "GET",
  });
}

export async function getAgentRunSteps(
  id: number
): Promise<AgentStepResponse[]> {
  return request<AgentStepResponse[]>(`/api/admin/agent/runs/${id}/steps`, {
    method: "GET",
  });
}

export async function startAgentInvestigation(
  id: number
): Promise<AgentRunResponse> {
  return request<AgentRunResponse>(`/api/admin/agent/runs/${id}/start`, {
    method: "POST",
  });
}

export async function approveAgentRun(
  id: number
): Promise<AgentRunResponse> {
  return request<AgentRunResponse>(`/api/admin/agent/runs/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectAgentRun(
  id: number,
  reason?: string
): Promise<AgentRunResponse> {
  return request<AgentRunResponse>(`/api/admin/agent/runs/${id}/reject`, {
    method: "POST",
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

export async function executeAgentAction(
  id: number
): Promise<ActionExecutionResponse> {
  return request<ActionExecutionResponse>(`/api/admin/agent/runs/${id}/execute`, {
    method: "POST",
  });
}

export async function getAgentRunRecommendations(
  id: number
): Promise<AgentRecommendationResponse[]> {
  return request<AgentRecommendationResponse[]>(
    `/api/admin/agent/runs/${id}/recommendations`,
    {
      method: "GET",
    }
  );
}

export async function getAgentRunTasks(
  id: number
): Promise<import("@/types/agent").AgentImplementationTaskResponse[]> {
  return request<import("@/types/agent").AgentImplementationTaskResponse[]>(
    `/api/admin/agent/runs/${id}/tasks`,
    {
      method: "GET",
    }
  );
}

export async function createAgentRunTask(
  id: number
): Promise<import("@/types/agent").AgentImplementationTaskResponse> {
  return request<import("@/types/agent").AgentImplementationTaskResponse>(
    `/api/admin/agent/runs/${id}/tasks`,
    {
      method: "POST",
    }
  );
}

export async function getAgentTask(
  taskId: number
): Promise<import("@/types/agent").AgentImplementationTaskResponse> {
  return request<import("@/types/agent").AgentImplementationTaskResponse>(
    `/api/admin/agent/tasks/${taskId}`,
    {
      method: "GET",
    }
  );
}

export async function startAgentTask(
  taskId: number
): Promise<import("@/types/agent").AgentImplementationTaskResponse> {
  return request<import("@/types/agent").AgentImplementationTaskResponse>(
    `/api/admin/agent/tasks/${taskId}/start`,
    {
      method: "POST",
    }
  );
}

export async function completeAgentTask(
  taskId: number
): Promise<import("@/types/agent").AgentImplementationTaskResponse> {
  return request<import("@/types/agent").AgentImplementationTaskResponse>(
    `/api/admin/agent/tasks/${taskId}/complete`,
    {
      method: "POST",
    }
  );
}

export async function cancelAgentTask(
  taskId: number,
  reason?: string
): Promise<import("@/types/agent").AgentImplementationTaskResponse> {
  return request<import("@/types/agent").AgentImplementationTaskResponse>(
    `/api/admin/agent/tasks/${taskId}/cancel`,
    {
      method: "POST",
      body: reason ? JSON.stringify({ reason }) : undefined,
    }
  );
}
