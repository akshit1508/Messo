package com.messo.agent;

import com.messo.agent.dto.AgentRunResponse;
import com.messo.agent.dto.AgentStepResponse;
import com.messo.agent.dto.AgentToolResponse;
import com.messo.security.CustomUserDetailsService;
import com.messo.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Security integration tests for {@link AgentController}.
 *
 * Verifies:
 * - Unauthenticated users receive 401 on all Agent endpoints
 * - STUDENT role receives 403 on all Agent endpoints
 * - ADMIN role with CSRF receives 200/201 on all Agent endpoints
 * - POST without CSRF returns 403 even for ADMIN
 */
@WebMvcTest(AgentController.class)
@Import(SecurityConfig.class)
class AgentControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AgentService agentService;

    @MockBean
    private CustomUserDetailsService userDetailsService;

    // =========================================================================
    // 1. UNAUTHENTICATED → 401
    // =========================================================================

    @Test
    void unauthenticated_postRun_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/agent/runs")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"goalType\":\"INVESTIGATE_OPERATIONAL_ISSUE\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_listRuns_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/agent/runs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_getRun_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/agent/runs/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_getRunSteps_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/agent/runs/1/steps"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_listTools_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/agent/tools"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 2. STUDENT ROLE → 403
    // =========================================================================

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_postRun_returns403() throws Exception {
        mockMvc.perform(post("/api/admin/agent/runs")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"goalType\":\"INVESTIGATE_OPERATIONAL_ISSUE\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_listRuns_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/agent/runs"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_getRun_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/agent/runs/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_getRunSteps_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/agent/runs/1/steps"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_listTools_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/agent/tools"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 3. CSRF enforcement for POST
    // =========================================================================

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postRunWithoutCsrf_returns403() throws Exception {
        mockMvc.perform(post("/api/admin/agent/runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"goalType\":\"INVESTIGATE_OPERATIONAL_ISSUE\"}"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 4. ADMIN ROLE with CSRF → 200/201
    // =========================================================================

    @Test
    @WithMockUser(roles = "ADMIN", username = "admin@messo.com")
    void adminRole_postRun_withCsrf_returns201() throws Exception {
        AgentRunResponse mockResponse = new AgentRunResponse(
                1L,
                AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE,
                "DINNER_SATISFACTION",
                "Why did dinner drop?",
                AgentTriggerType.MANUAL,
                AgentRunStatus.PENDING,
                null, false, "admin@messo.com",
                LocalDateTime.now(), null, null, null, null
        );
        when(agentService.createRun(any(), anyString())).thenReturn(mockResponse);

        mockMvc.perform(post("/api/admin/agent/runs")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"goalType\":\"INVESTIGATE_OPERATIONAL_ISSUE\"," +
                                 "\"goalTarget\":\"DINNER_SATISFACTION\"," +
                                 "\"goalDescription\":\"Why did dinner drop?\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.triggerType").value("MANUAL"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_listRuns_returns200() throws Exception {
        when(agentService.getAllRuns()).thenReturn(List.of());
        mockMvc.perform(get("/api/admin/agent/runs"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_getRun_returns200() throws Exception {
        AgentRunResponse mockResponse = new AgentRunResponse(
                1L, AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE, null, null,
                AgentTriggerType.MANUAL, AgentRunStatus.PENDING,
                null, false, "admin@messo.com",
                LocalDateTime.now(), null, null, null, null
        );
        when(agentService.getRun(1L)).thenReturn(mockResponse);

        mockMvc.perform(get("/api/admin/agent/runs/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_getRunSteps_returns200() throws Exception {
        when(agentService.getStepsForRun(1L)).thenReturn(List.of());
        mockMvc.perform(get("/api/admin/agent/runs/1/steps"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_listTools_returns200() throws Exception {
        when(agentService.getAllTools()).thenReturn(List.of(
                new AgentToolResponse("run_root_cause", AgentToolType.READ_ONLY, true, "WHY engine")
        ));
        mockMvc.perform(get("/api/admin/agent/tools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("run_root_cause"))
                .andExpect(jsonPath("$[0].readOnly").value(true));
    }

    // =========================================================================
    // 5. Validation: missing required goalType → 400
    // =========================================================================

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postRun_missingGoalType_returns400() throws Exception {
        mockMvc.perform(post("/api/admin/agent/runs")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"goalTarget\":\"DINNER\"}"))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // 6. executeTool endpoint security (Phase 2)
    // =========================================================================

    @Test
    void unauthenticated_postExecuteTool_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/agent/tools/get_recent_ratings/execute")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_postExecuteTool_returns403() throws Exception {
        mockMvc.perform(post("/api/admin/agent/tools/get_recent_ratings/execute")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postExecuteTool_withoutCsrf_returns403() throws Exception {
        mockMvc.perform(post("/api/admin/agent/tools/get_recent_ratings/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postExecuteTool_withCsrf_returns200() throws Exception {
        com.messo.agent.dto.ToolExecutionResponse mockResp = new com.messo.agent.dto.ToolExecutionResponse(
                true, "get_recent_ratings", AgentToolType.READ_ONLY, "Summary",
                java.util.Map.of(), java.util.Map.of(), null, null,
                java.time.LocalDateTime.now(), 15L
        );
        when(agentService.executeTool(any(), any())).thenReturn(mockResp);

        mockMvc.perform(post("/api/admin/agent/tools/get_recent_ratings/execute")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"limit\":\"50\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.toolName").value("get_recent_ratings"));
    }
}
