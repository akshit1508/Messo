package com.messo.agent;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link AgentToolDefinition} and {@link AgentToolRegistry}.
 *
 * Verifies:
 * - Tool definitions correctly distinguish READ_ONLY vs ACTION
 * - Registry contains expected tools
 * - isReadOnly() helper is accurate
 * - Invalid tool names throw NoSuchElementException
 */
class AgentToolRegistryTest {

    private final AgentToolRegistry registry = new AgentToolRegistry();

    // =========================================================================
    // READ_ONLY tools
    // =========================================================================

    @Test
    void getRecentRatings_isReadOnly() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.GET_RECENT_RATINGS);
        assertEquals(AgentToolType.READ_ONLY, def.getToolType());
        assertTrue(def.isReadOnly());
    }

    @Test
    void getComplaints_isReadOnly() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.GET_COMPLAINTS);
        assertEquals(AgentToolType.READ_ONLY, def.getToolType());
        assertTrue(def.isReadOnly());
    }

    @Test
    void getPollResults_isReadOnly() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.GET_POLL_RESULTS);
        assertEquals(AgentToolType.READ_ONLY, def.getToolType());
        assertTrue(def.isReadOnly());
    }

    @Test
    void getMenuHistory_isReadOnly() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.GET_MENU_HISTORY);
        assertEquals(AgentToolType.READ_ONLY, def.getToolType());
        assertTrue(def.isReadOnly());
    }

    @Test
    void runRootCause_isReadOnly() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.RUN_ROOT_CAUSE);
        assertEquals(AgentToolType.READ_ONLY, def.getToolType());
        assertTrue(def.isReadOnly(), "WHY engine must be classified READ_ONLY");
    }

    @Test
    void runForecast_isReadOnly() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.RUN_FORECAST);
        assertEquals(AgentToolType.READ_ONLY, def.getToolType());
        assertTrue(def.isReadOnly(), "WHAT NEXT engine must be classified READ_ONLY");
    }

    @Test
    void runSimulation_isReadOnly() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.RUN_SIMULATION);
        assertEquals(AgentToolType.READ_ONLY, def.getToolType());
        assertTrue(def.isReadOnly(), "WHAT IF engine must be classified READ_ONLY");
    }

    // =========================================================================
    // ACTION tools
    // =========================================================================

    @Test
    void createRecommendation_isAction() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.CREATE_RECOMMENDATION);
        assertEquals(AgentToolType.ACTION, def.getToolType());
        assertFalse(def.isReadOnly(), "create_recommendation must require approval");
    }

    @Test
    void createAdminTask_isAction() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.CREATE_ADMIN_TASK);
        assertEquals(AgentToolType.ACTION, def.getToolType());
        assertFalse(def.isReadOnly(), "create_admin_task must require approval");
    }

    @Test
    void sendNotification_isAction() {
        AgentToolDefinition def = registry.get(AgentToolRegistry.SEND_NOTIFICATION);
        assertEquals(AgentToolType.ACTION, def.getToolType());
        assertFalse(def.isReadOnly(), "send_notification must require approval");
    }

    // =========================================================================
    // Registry integrity
    // =========================================================================

    @Test
    void registry_containsAllExpectedTools() {
        assertTrue(registry.contains(AgentToolRegistry.GET_RECENT_RATINGS));
        assertTrue(registry.contains(AgentToolRegistry.GET_COMPLAINTS));
        assertTrue(registry.contains(AgentToolRegistry.GET_POLL_RESULTS));
        assertTrue(registry.contains(AgentToolRegistry.GET_MENU_HISTORY));
        assertTrue(registry.contains(AgentToolRegistry.RUN_ROOT_CAUSE));
        assertTrue(registry.contains(AgentToolRegistry.RUN_FORECAST));
        assertTrue(registry.contains(AgentToolRegistry.RUN_SIMULATION));
        assertTrue(registry.contains(AgentToolRegistry.CREATE_RECOMMENDATION));
        assertTrue(registry.contains(AgentToolRegistry.CREATE_ADMIN_TASK));
        assertTrue(registry.contains(AgentToolRegistry.SEND_NOTIFICATION));
    }

    @Test
    void registry_hasExactlyTenTools() {
        assertEquals(10, registry.all().size());
    }

    @Test
    void unknownTool_throwsNoSuchElementException() {
        assertThrows(java.util.NoSuchElementException.class,
                () -> registry.get("this_tool_does_not_exist"));
    }

    @Test
    void toolDefinition_rejectsBlankName() {
        assertThrows(IllegalArgumentException.class,
                () -> new AgentToolDefinition("", AgentToolType.READ_ONLY, "desc"));
    }

    @Test
    void toolDefinition_rejectsNullType() {
        assertThrows(IllegalArgumentException.class,
                () -> new AgentToolDefinition("some_tool", null, "desc"));
    }

    @Test
    void allReadOnlyTools_returnTrueForIsReadOnly() {
        registry.all().stream()
                .filter(d -> d.getToolType() == AgentToolType.READ_ONLY)
                .forEach(d -> assertTrue(d.isReadOnly(),
                        d.getName() + " should be isReadOnly()=true"));
    }

    @Test
    void allActionTools_returnFalseForIsReadOnly() {
        registry.all().stream()
                .filter(d -> d.getToolType() == AgentToolType.ACTION)
                .forEach(d -> assertFalse(d.isReadOnly(),
                        d.getName() + " should be isReadOnly()=false"));
    }
}
