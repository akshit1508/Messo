package com.messo.agent.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentImplementationTaskRepository extends JpaRepository<AgentImplementationTask, Long> {

    Optional<AgentImplementationTask> findByRecommendationId(Long recommendationId);

    Optional<AgentImplementationTask> findByAgentRunId(Long agentRunId);

    List<AgentImplementationTask> findAllByAgentRunIdOrderByCreatedAtDesc(Long agentRunId);
}
