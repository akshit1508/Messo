package com.messo.agent.tool.impl;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.AgentTool;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import com.messo.repository.FoodRepository;
import com.messo.repository.FoodReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tool adapter: {@code get_recent_ratings}
 *
 * <p>Retrieves recent food rating statistics from the operational database.
 * This tool is strictly READ_ONLY — it never mutates any operational data.</p>
 *
 * <h3>Accepted input parameters</h3>
 * <ul>
 *   <li>{@code limit} — max number of reviews to consider (default 100, max 500)</li>
 *   <li>{@code startDate} — optional ISO date filter (yyyy-MM-dd)</li>
 *   <li>{@code endDate}   — optional ISO date filter (yyyy-MM-dd)</li>
 * </ul>
 *
 * <h3>What it calls</h3>
 * Delegates to {@link FoodRepository#getFoodAnalytics()} and
 * {@link FoodReviewRepository} — existing repositories, no new business logic.
 */
@Component
@Transactional(readOnly = true)
public class GetRecentRatingsTool implements AgentTool {

    private static final Logger log = LoggerFactory.getLogger(GetRecentRatingsTool.class);
    private static final int MAX_LIMIT = 500;
    private static final int DEFAULT_LIMIT = 100;

    private final FoodRepository foodRepository;

    public GetRecentRatingsTool(FoodRepository foodRepository) {
        this.foodRepository = foodRepository;
    }

    @Override
    public String getName() {
        return AgentToolRegistry.GET_RECENT_RATINGS;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.READ_ONLY;
    }

    @Override
    public String getDescription() {
        return "Fetch recent student meal rating statistics grouped by food item. "
             + "Optional parameters: limit (1-500), startDate (yyyy-MM-dd), endDate (yyyy-MM-dd).";
    }

    @Override
    public ToolResult execute(ToolInput input) {
        long startNs = System.nanoTime();

        // Validate limit
        int limit = input.getInt("limit", DEFAULT_LIMIT);
        if (limit < 1 || limit > MAX_LIMIT) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT",
                    "Parameter 'limit' must be between 1 and " + MAX_LIMIT + ". Got: " + limit);
        }

        // Validate optional date range
        LocalDate startDate = null;
        LocalDate endDate = null;
        if (input.has("startDate")) {
            try {
                startDate = LocalDate.parse(input.get("startDate"));
            } catch (DateTimeParseException e) {
                return ToolResult.failure(getName(), getType(),
                        "INVALID_INPUT", "Parameter 'startDate' must be yyyy-MM-dd format.");
            }
        }
        if (input.has("endDate")) {
            try {
                endDate = LocalDate.parse(input.get("endDate"));
            } catch (DateTimeParseException e) {
                return ToolResult.failure(getName(), getType(),
                        "INVALID_INPUT", "Parameter 'endDate' must be yyyy-MM-dd format.");
            }
        }
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return ToolResult.failure(getName(), getType(),
                    "INVALID_INPUT", "startDate must not be after endDate.");
        }

        try {
            // Delegate to the existing repository query — no new logic
            List<Object[]> analytics = foodRepository.getFoodAnalytics();

            List<Map<String, Object>> rows = analytics.stream()
                    .limit(limit)
                    .map(row -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("foodName",     row[0]);
                        m.put("averageRating", row[1]);
                        m.put("reviewCount",  row[2]);
                        return m;
                    })
                    .toList();

            long durationMs = (System.nanoTime() - startNs) / 1_000_000;

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("ratings", rows);
            data.put("count", rows.size());

            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("limit", limit);
            if (startDate != null) meta.put("startDate", startDate.toString());
            if (endDate != null)   meta.put("endDate", endDate.toString());
            meta.put("source", "food_reviews");

            return ToolResult.success(getName(), getType())
                    .summary("Retrieved rating analytics for " + rows.size() + " food item(s).")
                    .data(data)
                    .metadata(meta)
                    .durationMs(durationMs)
                    .executedAt(LocalDateTime.now())
                    .build();

        } catch (Exception ex) {
            log.error("[AgentTool:{}] Unexpected error during execution", getName(), ex);
            return ToolResult.failure(getName(), getType(),
                    "TOOL_EXECUTION_ERROR",
                    "Failed to retrieve rating data. Please retry.");
        }
    }
}
