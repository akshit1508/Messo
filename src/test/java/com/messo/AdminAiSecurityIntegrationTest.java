package com.messo;

import com.messo.controller.api.AdminAiApiController;
import com.messo.security.CustomUserDetailsService;
import com.messo.security.SecurityConfig;
import com.messo.service.AiGatewayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminAiApiController.class)
@Import(SecurityConfig.class)
class AdminAiSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiGatewayService aiGatewayService;

    @MockBean
    private CustomUserDetailsService userDetailsService;

    // ==========================================
    // 1. UNAUTHENTICATED TESTS -> MUST RETURN 401
    // ==========================================
    @Test
    void unauthenticated_postInvestigation_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/ai/investigations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"start_date\":\"2026-03-01\",\"end_date\":\"2026-03-07\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_postForecast_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/ai/forecasts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"food_name\":\"Rajma\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_postSimulation_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/ai/simulations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scenario_type\":\"FOOD_REPLACEMENT\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_getHistory_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/ai/simulations/history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_getFoods_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/ai/foods"))
                .andExpect(status().isUnauthorized());
    }

    // ==========================================
    // 2. STUDENT ROLE TESTS -> MUST RETURN 403
    // ==========================================
    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_postInvestigation_returns403() throws Exception {
        mockMvc.perform(post("/api/admin/ai/investigations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"start_date\":\"2026-03-01\",\"end_date\":\"2026-03-07\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_getHistory_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/ai/simulations/history"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentRole_getFoods_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/ai/foods"))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 3. CSRF ENFORCEMENT -> POST WITHOUT CSRF MUST RETURN 403
    // ==========================================
    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postWithoutCsrf_returns403() throws Exception {
        mockMvc.perform(post("/api/admin/ai/investigations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"start_date\":\"2026-03-01\",\"end_date\":\"2026-03-07\"}"))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 4. ADMIN ROLE WITH CSRF -> MUST RETURN 200
    // ==========================================
    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postInvestigation_withCsrf_returns200() throws Exception {
        when(aiGatewayService.runInvestigation(any())).thenReturn(ResponseEntity.ok("{\"status\":\"ok\"}"));

        mockMvc.perform(post("/api/admin/ai/investigations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"start_date\":\"2026-03-01\",\"end_date\":\"2026-03-07\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postForecast_withCsrf_returns200() throws Exception {
        when(aiGatewayService.runForecast(any())).thenReturn(ResponseEntity.ok("{\"point_prediction\":3.8}"));

        mockMvc.perform(post("/api/admin/ai/forecasts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"food_name\":\"Rajma\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_postSimulation_withCsrf_returns200() throws Exception {
        when(aiGatewayService.runSimulation(any())).thenReturn(ResponseEntity.ok("{\"simulation_id\":\"sim-1\"}"));

        mockMvc.perform(post("/api/admin/ai/simulations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scenario_type\":\"FOOD_REPLACEMENT\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_getHistory_returns200() throws Exception {
        when(aiGatewayService.getSimulationHistory(anyInt())).thenReturn(ResponseEntity.ok("[]"));

        mockMvc.perform(get("/api/admin/ai/simulations/history"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRole_getFoods_returns200() throws Exception {
        when(aiGatewayService.getAvailableFoods()).thenReturn(ResponseEntity.ok("[\"Rajma\"]"));

        mockMvc.perform(get("/api/admin/ai/foods"))
                .andExpect(status().isOk());
    }
}
