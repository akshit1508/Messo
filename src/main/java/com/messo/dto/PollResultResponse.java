package com.messo.dto;

import java.util.List;

public record PollResultResponse(
        Long pollId,
        boolean active,
        String winningFood,
        long totalVotes,
        List<PollOptionResultDto> results
) {}
