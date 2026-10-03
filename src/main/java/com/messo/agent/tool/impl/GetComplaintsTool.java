package com.messo.agent.tool.impl;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.AgentTool;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import com.messo.model.Complaint;
import com.messo.repository.ComplaintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tool adapter: {@code get_complaints}
 *
 * <p>Retrieves complaint records from the operational database for Agent analysis.
 * This tool is strictly READ_ONLY — it never resolves, modifies, or deletes complaints.</p>
 *
 * <h3>Accepted input parameters</h3>
 * <ul>
 *   <li>{@code limit}     — max complaints to return (default 50, max 200)</li>
 *   <li>{@code resolved}  — optional filter: "true" / "false" (default: all)</li>
 *   <li>{@code type}      — optional filter by complaint type string</li>
 * </ul>
 *
 * <h3>What it calls</h3>
 * Delegates to {@link ComplaintRepository} — existing repository, no new business logic.
 */
@Component
@Transactional(readOnly = true)
public class GetComplaintsTool implements AgentTool {

    private static final Logger log = LoggerFactory.getLogger(GetComplaintsTool.class);
    private static final int MAX_LIMIT = 200;
    private static final int DEFAULT_LIMIT = 50;

    private final ComplaintRepository complaintRepository;

    public GetComplaintsTool(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    @Override
    public String getName() {
        return AgentToolRegistry.GET_COMPLAINTS;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.READ_ONLY;
    }

    @Override
    public String getDescription() {
        return "Fetch complaint records for operational analysis. "
             + "Optional parameters: limit (1-200), resolved (true/false), type (complaint type string).";
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

        // Optional resolved filter
        Boolean resolvedFilter = null;
        if (input.has("resolved")) {
            String rv = input.get("resolved").trim().toLowerCase();
            if ("true".equals(rv)) {
                resolvedFilter = Boolean.TRUE;
            } else if ("false".equals(rv)) {
                resolvedFilter = Boolean.FALSE;
            } else {
                return ToolResult.failure(getName(), getType(),
                        "INVALID_INPUT",
                        "Parameter 'resolved' must be 'true' or 'false'. Got: " + rv);
            }
        }

        // Optional type filter
        String typeFilter = input.has("type") ? input.get("type").trim() : null;

        try {
            // Delegate to existing repository — no new business logic
            List<Complaint> all = complaintRepository.findAll(
                    Sort.by(Sort.Direction.DESC, "createdAt"));

            final Boolean finalResolved = resolvedFilter;
            final String finalType = typeFilter;

            List<Map<String, Object>> rows = all.stream()
                    .filter(c -> finalResolved == null || c.isResolved() == finalResolved)
                    .filter(c -> finalType == null
                            || (c.getType() != null && c.getType().equalsIgnoreCase(finalType)))
                    .limit(limit)
                    .map(this::toMap)
                    .toList();

            long durationMs = (System.nanoTime() - startNs) / 1_000_000;

            // Summary statistics
            long pending  = rows.stream().filter(m -> Boolean.FALSE.equals(m.get("resolved"))).count();
            long resolved = rows.stream().filter(m -> Boolean.TRUE.equals(m.get("resolved"))).count();

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("complaints", rows);
            data.put("count", rows.size());
            data.put("pendingCount", pending);
            data.put("resolvedCount", resolved);

            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("limit", limit);
            if (finalResolved != null) meta.put("resolvedFilter", finalResolved);
            if (finalType != null) meta.put("typeFilter", finalType);
            meta.put("source", "complaints");

            return ToolResult.success(getName(), getType())
                    .summary("Retrieved " + rows.size() + " complaint record(s). "
                            + "Pending: " + pending + ", Resolved: " + resolved + ".")
                    .data(data)
                    .metadata(meta)
                    .durationMs(durationMs)
                    .executedAt(LocalDateTime.now())
                    .build();

        } catch (Exception ex) {
            log.error("[AgentTool:{}] Unexpected error during execution", getName(), ex);
            return ToolResult.failure(getName(), getType(),
                    "TOOL_EXECUTION_ERROR",
                    "Failed to retrieve complaint data. Please retry.");
        }
    }

    private Map<String, Object> toMap(Complaint c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          c.getId());
        m.put("type",        c.getType());
        m.put("description", c.getDescription());
        m.put("rating",      c.getRating());
        m.put("resolved",    c.isResolved());
        m.put("createdAt",   c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        return m;
    }
}
