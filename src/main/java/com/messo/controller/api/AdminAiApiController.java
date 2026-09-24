package com.messo.controller.api;

import com.messo.service.AiGatewayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai")
public class AdminAiApiController {

    private final AiGatewayService aiGatewayService;

    public AdminAiApiController(AiGatewayService aiGatewayService) {
        this.aiGatewayService = aiGatewayService;
    }

    @PostMapping("/investigations")
    public ResponseEntity<Object> runInvestigation(@RequestBody(required = false) Map<String, Object> payload) {
        Map<String, Object> body = payload != null ? payload : Map.of();
        return aiGatewayService.runInvestigation(body);
    }

    @PostMapping("/forecasts")
    public ResponseEntity<Object> runForecast(@RequestBody(required = false) Map<String, Object> payload) {
        Map<String, Object> body = payload != null ? payload : Map.of();
        return aiGatewayService.runForecast(body);
    }

    @PostMapping("/simulations")
    public ResponseEntity<Object> runSimulation(@RequestBody(required = false) Map<String, Object> payload) {
        Map<String, Object> body = payload != null ? payload : Map.of();
        return aiGatewayService.runSimulation(body);
    }

    @GetMapping("/simulations/history")
    public ResponseEntity<Object> getSimulationHistory(@RequestParam(defaultValue = "10") int limit) {
        return aiGatewayService.getSimulationHistory(limit);
    }

    @GetMapping("/foods")
    public ResponseEntity<Object> getAvailableFoods() {
        return aiGatewayService.getAvailableFoods();
    }
}
