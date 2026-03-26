package com.messo.repository;

import com.messo.model.PollVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {

    // For student: prevent multiple votes
    boolean existsByUserEmailAndOptionPollId(String email, Long pollId);

    boolean existsByUserIdAndOptionPollId(Long userId, Long pollId);

    // 🔥 FOR ADMIN RESULTS (THIS WAS MISSING / WRONG)
    @Query("""
        SELECT o.foodName, COUNT(v.id)
        FROM PollVote v
        JOIN v.option o
        WHERE o.poll.id = :pollId
        GROUP BY o.foodName
    """)
    List<Object[]> getPollResults(@Param("pollId") Long pollId);
}
