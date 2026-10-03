package com.messo.agent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link AgentStep}.
 *
 * Follows the same pattern as other MESSO repositories.
 */
@Repository
public interface AgentStepRepository extends JpaRepository<AgentStep, Long> {

    /**
     * Returns all steps for a given run, ordered by sequence ascending.
     * This is the primary query for displaying step progress.
     */
    List<AgentStep> findByRunIdOrderBySequenceOrderAsc(Long runId);

    /**
     * Returns the count of steps for a run in a given status.
     */
    long countByRunIdAndStatus(Long runId, AgentStepStatus status);
}
