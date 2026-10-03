package com.messo.agent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link AgentRun}.
 *
 * Follows the same pattern as other MESO repositories
 * (e.g., ComplaintRepository, FoodReviewRepository).
 */
@Repository
public interface AgentRunRepository extends JpaRepository<AgentRun, Long> {

    /**
     * Returns all runs initiated by a specific administrator, ordered by
     * creation time descending (newest first).
     */
    List<AgentRun> findByInitiatedByOrderByCreatedAtDesc(String initiatedBy);

    /**
     * Returns all runs with a specific status, ordered by creation time descending.
     */
    List<AgentRun> findByStatusOrderByCreatedAtDesc(AgentRunStatus status);

    /**
     * Returns all runs ordered by creation time descending (admin overview).
     */
    List<AgentRun> findAllByOrderByCreatedAtDesc();
}
