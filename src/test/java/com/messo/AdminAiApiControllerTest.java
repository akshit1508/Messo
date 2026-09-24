package com.messo;

import com.messo.controller.api.AdminAiApiController;
import com.messo.service.AiGatewayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAiApiControllerTest {

    @Mock
    private AiGatewayService aiGatewayService;

    private AdminAiApiController controller;

    @BeforeEach
    void setUp() {
        controller = new AdminAiApiController(aiGatewayService);
    }

    @Test
    void testRunInvestigation() {
        Map<String, Object> req = Map.of("start_date", "2026-03-01", "end_date", "2026-03-07");
        when(aiGatewayService.runInvestigation(req)).thenReturn(ResponseEntity.ok((Object) "{\"status\":\"success\"}"));

        ResponseEntity<Object> response = controller.runInvestigation(req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("{\"status\":\"success\"}", response.getBody());
        verify(aiGatewayService, times(1)).runInvestigation(req);
    }

    @Test
    void testRunForecast() {
        Map<String, Object> req = Map.of("food_name", "Rajma", "forecast_date", "2026-03-25");
        when(aiGatewayService.runForecast(req)).thenReturn(ResponseEntity.ok((Object) "{\"point_prediction\":3.85}"));

        ResponseEntity<Object> response = controller.runForecast(req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(aiGatewayService, times(1)).runForecast(req);
    }

    @Test
    void testRunSimulation() {
        Map<String, Object> req = Map.of("scenario_name", "Test Sim", "scenario_type", "food_replacement");
        when(aiGatewayService.runSimulation(req)).thenReturn(ResponseEntity.ok((Object) "{\"simulation_id\":\"sim-123\"}"));

        ResponseEntity<Object> response = controller.runSimulation(req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(aiGatewayService, times(1)).runSimulation(req);
    }

    @Test
    void testGetSimulationHistory() {
        when(aiGatewayService.getSimulationHistory(5)).thenReturn(ResponseEntity.ok((Object) "[]"));

        ResponseEntity<Object> response = controller.getSimulationHistory(5);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(aiGatewayService, times(1)).getSimulationHistory(5);
    }

    @Test
    void testGetAvailableFoods() {
        when(aiGatewayService.getAvailableFoods()).thenReturn(ResponseEntity.ok((Object) "[\"Rajma\", \"Chole Bhature\"]"));

        ResponseEntity<Object> response = controller.getAvailableFoods();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(aiGatewayService, times(1)).getAvailableFoods();
    }

    @Test
    void testAiServiceUnavailableHandling() {
        Map<String, Object> errBody = Map.of(
                "status", 503,
                "error", "AI_SERVICE_UNAVAILABLE",
                "message", "AI analysis service is temporarily unavailable. Please retry."
        );
        when(aiGatewayService.runForecast(any())).thenReturn(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errBody));

        ResponseEntity<Object> response = controller.runForecast(Map.of("food_name", "Rajma"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals(errBody, response.getBody());
    }

    @Test
    void testAiServiceBadGatewayHandling() {
        Map<String, Object> errBody = Map.of(
                "status", 502,
                "error", "AI_SERVICE_ERROR",
                "message", "AI analysis service encountered an internal error. Please retry."
        );
        when(aiGatewayService.runInvestigation(any())).thenReturn(ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(errBody));

        ResponseEntity<Object> response = controller.runInvestigation(Map.of("start_date", "2026-03-01"));

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals(errBody, response.getBody());
    }
}
