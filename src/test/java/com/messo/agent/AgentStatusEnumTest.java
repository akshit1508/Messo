package com.messo.agent;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for Agent Run and Step status enums.
 *
 * Verifies:
 * - All expected status values exist
 * - Enum valueOf works for all defined statuses
 */
class AgentStatusEnumTest {

    // =========================================================================
    // AgentRunStatus
    // =========================================================================

    @Test
    void agentRunStatus_pendingExists() {
        assertEquals(AgentRunStatus.PENDING, AgentRunStatus.valueOf("PENDING"));
    }

    @Test
    void agentRunStatus_runningExists() {
        assertEquals(AgentRunStatus.RUNNING, AgentRunStatus.valueOf("RUNNING"));
    }

    @Test
    void agentRunStatus_waitingForApprovalExists() {
        assertEquals(AgentRunStatus.WAITING_FOR_APPROVAL, AgentRunStatus.valueOf("WAITING_FOR_APPROVAL"));
    }

    @Test
    void agentRunStatus_approvedExists() {
        assertEquals(AgentRunStatus.APPROVED, AgentRunStatus.valueOf("APPROVED"));
    }

    @Test
    void agentRunStatus_completedExists() {
        assertEquals(AgentRunStatus.COMPLETED, AgentRunStatus.valueOf("COMPLETED"));
    }

    @Test
    void agentRunStatus_failedExists() {
        assertEquals(AgentRunStatus.FAILED, AgentRunStatus.valueOf("FAILED"));
    }

    @Test
    void agentRunStatus_cancelledExists() {
        assertEquals(AgentRunStatus.CANCELLED, AgentRunStatus.valueOf("CANCELLED"));
    }

    @Test
    void agentRunStatus_hasSevenValues() {
        assertEquals(7, AgentRunStatus.values().length);
    }

    @Test
    void agentRunStatus_rejectsUnknownValue() {
        assertThrows(IllegalArgumentException.class,
                () -> AgentRunStatus.valueOf("UNKNOWN_STATUS"));
    }

    // =========================================================================
    // AgentStepStatus
    // =========================================================================

    @Test
    void agentStepStatus_pendingExists() {
        assertEquals(AgentStepStatus.PENDING, AgentStepStatus.valueOf("PENDING"));
    }

    @Test
    void agentStepStatus_runningExists() {
        assertEquals(AgentStepStatus.RUNNING, AgentStepStatus.valueOf("RUNNING"));
    }

    @Test
    void agentStepStatus_completedExists() {
        assertEquals(AgentStepStatus.COMPLETED, AgentStepStatus.valueOf("COMPLETED"));
    }

    @Test
    void agentStepStatus_failedExists() {
        assertEquals(AgentStepStatus.FAILED, AgentStepStatus.valueOf("FAILED"));
    }

    @Test
    void agentStepStatus_skippedExists() {
        assertEquals(AgentStepStatus.SKIPPED, AgentStepStatus.valueOf("SKIPPED"));
    }

    @Test
    void agentStepStatus_hasFiveValues() {
        assertEquals(5, AgentStepStatus.values().length);
    }

    // =========================================================================
    // AgentGoalType
    // =========================================================================

    @Test
    void agentGoalType_investigateOperationalIssueExists() {
        assertEquals(AgentGoalType.INVESTIGATE_OPERATIONAL_ISSUE,
                AgentGoalType.valueOf("INVESTIGATE_OPERATIONAL_ISSUE"));
    }

    @Test
    void agentGoalType_investigateRatingDropExists() {
        assertEquals(AgentGoalType.INVESTIGATE_RATING_DROP,
                AgentGoalType.valueOf("INVESTIGATE_RATING_DROP"));
    }

    @Test
    void agentGoalType_investigateComplaintSpikeExists() {
        assertEquals(AgentGoalType.INVESTIGATE_COMPLAINT_SPIKE,
                AgentGoalType.valueOf("INVESTIGATE_COMPLAINT_SPIKE"));
    }

    @Test
    void agentGoalType_reviewMenuPerformanceExists() {
        assertEquals(AgentGoalType.REVIEW_MENU_PERFORMANCE,
                AgentGoalType.valueOf("REVIEW_MENU_PERFORMANCE"));
    }
}
