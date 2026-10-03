package com.messo.agent.tool.impl;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.AgentTool;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import com.messo.model.DailyMenu;
import com.messo.repository.DailyMenuRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tool adapter: {@code get_menu_history}
 *
 * <p>Retrieves historical daily menu records for Agent analysis.
 * This tool is strictly READ_ONLY — it never creates, modifies, or deletes menu entries.</p>
 *
 * <h3>Accepted input parameters</h3>
 * <ul>
 *   <li>{@code limit}     — max days to return (default 30, max 180)</li>
 *   <li>{@code startDate} — optional ISO date filter (yyyy-MM-dd)</li>
 *   <li>{@code endDate}   — optional ISO date filter (yyyy-MM-dd)</li>
 * </ul>
 *
 * <h3>What it calls</h3>
 * Delegates to {@link DailyMenuRepository} — existing repository, no new business logic.
 */
@Component
@Transactional(readOnly = true)
public class GetMenuHistoryTool implements AgentTool {

    private static final Logger log = LoggerFactory.getLogger(GetMenuHistoryTool.class);
    private static final int MAX_LIMIT = 180;
    private static final int DEFAULT_LIMIT = 30;

    private final DailyMenuRepository dailyMenuRepository;

    public GetMenuHistoryTool(DailyMenuRepository dailyMenuRepository) {
        this.dailyMenuRepository = dailyMenuRepository;
    }

    @Override
    public String getName() {
        return AgentToolRegistry.GET_MENU_HISTORY;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.READ_ONLY;
    }

    @Override
    public String getDescription() {
        return "Fetch historical daily menu records for trend analysis. "
             + "Optional parameters: limit (1-180), startDate (yyyy-MM-dd), endDate (yyyy-MM-dd).";
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
            // Delegate to existing repository — fetch all ordered by date descending
            List<DailyMenu> all = dailyMenuRepository.findAll(
                    Sort.by(Sort.Direction.DESC, "menuDate"));

            final LocalDate filterStart = startDate;
            final LocalDate filterEnd = endDate;

            List<Map<String, Object>> rows = all.stream()
                    .filter(m -> filterStart == null || !m.getMenuDate().isBefore(filterStart))
                    .filter(m -> filterEnd == null   || !m.getMenuDate().isAfter(filterEnd))
                    .limit(limit)
                    .map(this::toMap)
                    .toList();

            long durationMs = (System.nanoTime() - startNs) / 1_000_000;

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("menuHistory", rows);
            data.put("count", rows.size());

            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("limit", limit);
            if (filterStart != null) meta.put("startDate", filterStart.toString());
            if (filterEnd != null)   meta.put("endDate", filterEnd.toString());
            meta.put("source", "daily_menu");

            return ToolResult.success(getName(), getType())
                    .summary("Retrieved " + rows.size() + " daily menu record(s).")
                    .data(data)
                    .metadata(meta)
                    .durationMs(durationMs)
                    .executedAt(LocalDateTime.now())
                    .build();

        } catch (Exception ex) {
            log.error("[AgentTool:{}] Unexpected error during execution", getName(), ex);
            return ToolResult.failure(getName(), getType(),
                    "TOOL_EXECUTION_ERROR",
                    "Failed to retrieve menu history. Please retry.");
        }
    }

    private Map<String, Object> toMap(DailyMenu m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("menuDate", m.getMenuDate().toString());
        if (m.getFood() != null) {
            map.put("foodId",   m.getFood().getId());
            map.put("foodName", m.getFood().getName());
            map.put("mealType", m.getFood().getMealType());
        }
        return map;
    }
}
