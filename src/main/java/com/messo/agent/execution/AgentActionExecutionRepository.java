package com.messo.agent.execution;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AgentActionExecutionRepository extends JpaRepository<AgentActionExecution, Long> {
    Optional<AgentActionExecution> findByAgentRunId(Long agentRunId);
    boolean existsByAgentRunId(Long agentRunId);
}
