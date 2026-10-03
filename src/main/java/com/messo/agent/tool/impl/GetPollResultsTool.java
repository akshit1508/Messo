package com.messo.agent.tool.impl;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.AgentTool;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import com.messo.model.FoodPoll;
import com.messo.repository.FoodPollRepository;
import com.messo.repository.PollVoteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Tool adapter: {@code get_poll_results}
 *
 * <p>Retrieves student food poll results for Agent analysis.
 * This tool is strictly READ_ONLY — it never creates, votes in, or closes polls.</p>
 *
 * <h3>Accepted input parameters</h3>
 * <ul>
 *   <li>{@code pollId} — optional: specific poll ID to retrieve results for.
 *       If omitted, returns results for the currently active poll.</li>
 * </ul>
 *
 * <h3>What it calls</h3>
 * Delegates to {@link FoodPollRepository} and {@link PollVoteRepository} —
 * existing repositories, no new business logic.
 */
@Component
@Transactional(readOnly = true)
public class GetPollResultsTool implements AgentTool {

    private static final Logger log = LoggerFactory.getLogger(GetPollResultsTool.class);

    private final FoodPollRepository foodPollRepository;
    private final PollVoteRepository pollVoteRepository;

    public GetPollResultsTool(FoodPollRepository foodPollRepository,
                               PollVoteRepository pollVoteRepository) {
        this.foodPollRepository = foodPollRepository;
        this.pollVoteRepository = pollVoteRepository;
    }

    @Override
    public String getName() {
        return AgentToolRegistry.GET_POLL_RESULTS;
    }

    @Override
    public AgentToolType getType() {
        return AgentToolType.READ_ONLY;
    }

    @Override
    public String getDescription() {
        return "Fetch student food poll results. "
             + "Optional parameter: pollId (Long). If omitted, returns the active poll results.";
    }

    @Override
    public ToolResult execute(ToolInput input) {
        long startNs = System.nanoTime();

        try {
            FoodPoll poll;

            if (input.has("pollId")) {
                // Validate and parse the poll ID
                long pollId;
                try {
                    pollId = Long.parseLong(input.get("pollId").trim());
                    if (pollId < 1) {
                        return ToolResult.failure(getName(), getType(),
                                "INVALID_INPUT", "Parameter 'pollId' must be a positive number.");
                    }
                } catch (NumberFormatException e) {
                    return ToolResult.failure(getName(), getType(),
                            "INVALID_INPUT", "Parameter 'pollId' must be a valid numeric ID.");
                }

                Optional<FoodPoll> found = foodPollRepository.findById(pollId);
                if (found.isEmpty()) {
                    return ToolResult.failure(getName(), getType(),
                            "NOT_FOUND", "Poll with id " + pollId + " was not found.");
                }
                poll = found.get();

            } else {
                // Default: retrieve the active poll
                Optional<FoodPoll> activePoll = foodPollRepository.findActivePollWithOptions();
                if (activePoll.isEmpty()) {
                    long durationMs = (System.nanoTime() - startNs) / 1_000_000;
                    return ToolResult.success(getName(), getType())
                            .summary("No active poll found.")
                            .data(Map.of("activePoll", false, "results", List.of()))
                            .metadata(Map.of("source", "food_polls"))
                            .durationMs(durationMs)
                            .executedAt(LocalDateTime.now())
                            .build();
                }
                poll = activePoll.get();
            }

            // Fetch vote results for this poll using the existing repository query
            List<Object[]> voteResults = pollVoteRepository.getPollResults(poll.getId());

            List<Map<String, Object>> results = voteResults.stream()
                    .map(row -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("foodName",   row[0]);
                        m.put("voteCount",  row[1]);
                        return m;
                    })
                    .toList();

            long totalVotes = results.stream()
                    .mapToLong(m -> ((Number) m.get("voteCount")).longValue())
                    .sum();

            long durationMs = (System.nanoTime() - startNs) / 1_000_000;

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("pollId",     poll.getId());
            data.put("pollDate",   poll.getPollDate() != null ? poll.getPollDate().toString() : null);
            data.put("active",     poll.isActive());
            data.put("results",    results);
            data.put("totalVotes", totalVotes);

            return ToolResult.success(getName(), getType())
                    .summary("Retrieved poll results for poll " + poll.getId()
                            + " with " + totalVotes + " total vote(s).")
                    .data(data)
                    .metadata(Map.of("source", "food_polls + poll_votes", "pollId", poll.getId()))
                    .durationMs(durationMs)
                    .executedAt(LocalDateTime.now())
                    .build();

        } catch (Exception ex) {
            log.error("[AgentTool:{}] Unexpected error during execution", getName(), ex);
            return ToolResult.failure(getName(), getType(),
                    "TOOL_EXECUTION_ERROR",
                    "Failed to retrieve poll data. Please retry.");
        }
    }
}
