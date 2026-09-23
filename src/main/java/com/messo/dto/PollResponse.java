package com.messo.dto;

import java.time.LocalDate;
import java.util.List;

public record PollResponse(
        Long pollId,
        LocalDate pollDate,
        boolean active,
        boolean alreadyVoted,
        List<PollOptionDto> options,
        String message
) {
    public static PollResponse noActivePoll() {
        return new PollResponse(null, null, false, false, List.of(), "No active poll available");
    }

    public static PollResponse active(Long pollId, LocalDate pollDate, boolean alreadyVoted, List<PollOptionDto> options) {
        return new PollResponse(pollId, pollDate, true, alreadyVoted, options, "Active poll available");
    }
}
