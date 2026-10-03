package com.messo.agent.recommendation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AgentRecommendationRepository extends JpaRepository<AgentRecommendation, Long> {
    List<AgentRecommendation> findByAgentRunId(Long agentRunId);
    boolean existsByAgentRunId(Long agentRunId);
}
