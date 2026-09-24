package com.messo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.Map;

@Service
public class AiGatewayService {

    private static final Logger log = LoggerFactory.getLogger(AiGatewayService.class);

    private final RestClient restClient;
    private final String aiServiceUrl;

    public AiGatewayService(@Value("${app.ai-service.url:http://127.0.0.1:8000}") String aiServiceUrl) {
        this.aiServiceUrl = aiServiceUrl;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));

        this.restClient = RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public ResponseEntity<Object> runInvestigation(Map<String, Object> payload) {
        return forwardPost("/api/v1/investigations", payload);
    }

    public ResponseEntity<Object> runForecast(Map<String, Object> payload) {
        return forwardPost("/api/v1/forecasts", payload);
    }

    public ResponseEntity<Object> runSimulation(Map<String, Object> payload) {
        return forwardPost("/api/v1/simulations", payload);
    }

    public ResponseEntity<Object> getSimulationHistory(int limit) {
        return forwardGet("/api/v1/simulations/history?limit=" + limit);
    }

    public ResponseEntity<Object> getAvailableFoods() {
        return forwardGet("/api/v1/simulations/foods");
    }

    private ResponseEntity<Object> forwardPost(String path, Map<String, Object> payload) {
        try {
            ResponseEntity<String> res = restClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toEntity(String.class);
            return ResponseEntity.status(res.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(res.getBody());
        } catch (RestClientResponseException ex) {
            log.warn("AI service returned error {} for POST {}: {}", ex.getStatusCode(), path, ex.getResponseBodyAsString());
            if (ex.getStatusCode().is5xxServerError()) {
                Map<String, Object> err = Map.of(
                        "status", HttpStatus.BAD_GATEWAY.value(),
                        "error", "AI_SERVICE_ERROR",
                        "message", "AI analysis service encountered an internal error. Please retry."
                );
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err);
            }
            return ResponseEntity.status(ex.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Failed to connect to AI service at {} for POST {}: {}", aiServiceUrl, path, ex.getMessage());
            Map<String, Object> err = Map.of(
                    "status", HttpStatus.SERVICE_UNAVAILABLE.value(),
                    "error", "AI_SERVICE_UNAVAILABLE",
                    "message", "AI analysis service is temporarily unavailable. Please retry."
            );
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(err);
        }
    }

    private ResponseEntity<Object> forwardGet(String path) {
        try {
            ResponseEntity<String> res = restClient.get()
                    .uri(path)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .toEntity(String.class);
            return ResponseEntity.status(res.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(res.getBody());
        } catch (RestClientResponseException ex) {
            log.warn("AI service returned error {} for GET {}: {}", ex.getStatusCode(), path, ex.getResponseBodyAsString());
            if (ex.getStatusCode().is5xxServerError()) {
                Map<String, Object> err = Map.of(
                        "status", HttpStatus.BAD_GATEWAY.value(),
                        "error", "AI_SERVICE_ERROR",
                        "message", "AI analysis service encountered an internal error. Please retry."
                );
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err);
            }
            return ResponseEntity.status(ex.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Failed to connect to AI service at {} for GET {}: {}", aiServiceUrl, path, ex.getMessage());
            Map<String, Object> err = Map.of(
                    "status", HttpStatus.SERVICE_UNAVAILABLE.value(),
                    "error", "AI_SERVICE_UNAVAILABLE",
                    "message", "AI analysis service is temporarily unavailable. Please retry."
            );
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(err);
        }
    }
}
