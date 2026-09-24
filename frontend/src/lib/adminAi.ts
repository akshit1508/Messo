import { request } from "./api";
import {
  InvestigationRequest,
  InvestigationResponse,
  ForecastRequest,
  ForecastResponse,
  SimulationRequest,
  SimulationResponse,
  SimulationHistoryItem,
} from "@/types/ai";

/**
 * AI Microservice Gateway Client for MESO Admin.
 * All requests route via Spring Boot API Gateway (/api/admin/ai/*).
 * Authentication via existing session cookies.
 */

export async function runInvestigation(
  params: InvestigationRequest
): Promise<InvestigationResponse> {
  return request<InvestigationResponse>("/api/admin/ai/investigations", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function runForecast(
  params: ForecastRequest
): Promise<ForecastResponse> {
  return request<ForecastResponse>("/api/admin/ai/forecasts", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function runSimulation(
  params: SimulationRequest
): Promise<SimulationResponse> {
  return request<SimulationResponse>("/api/admin/ai/simulations", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getSimulationHistory(
  limit: number = 10
): Promise<SimulationHistoryItem[]> {
  return request<SimulationHistoryItem[]>(
    `/api/admin/ai/simulations/history?limit=${limit}`,
    {
      method: "GET",
    }
  );
}

export async function getAvailableFoods(): Promise<string[]> {
  return request<string[]>("/api/admin/ai/foods", {
    method: "GET",
  });
}
