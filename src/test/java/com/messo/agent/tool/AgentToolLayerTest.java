package com.messo.agent.tool;

import com.messo.agent.AgentToolRegistry;
import com.messo.agent.AgentToolType;
import com.messo.agent.tool.impl.*;
import com.messo.agent.tool.input.ToolInput;
import com.messo.agent.tool.result.ToolResult;
import com.messo.model.Complaint;
import com.messo.model.DailyMenu;
import com.messo.model.Food;
import com.messo.model.FoodPoll;
import com.messo.repository.ComplaintRepository;
import com.messo.repository.DailyMenuRepository;
import com.messo.repository.FoodPollRepository;
import com.messo.repository.FoodRepository;
import com.messo.repository.PollVoteRepository;
import com.messo.service.AiGatewayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentToolLayerTest {

    // Repositories for read tools
    @Mock
    private FoodRepository foodRepository;
    @Mock
    private ComplaintRepository complaintRepository;
    @Mock
    private FoodPollRepository foodPollRepository;
    @Mock
    private PollVoteRepository pollVoteRepository;
    @Mock
    private DailyMenuRepository dailyMenuRepository;

    // AI gateway
    @Mock
    private AiGatewayService aiGatewayService;

    private AgentToolExecutor executor;
    private GetRecentRatingsTool ratingsTool;
    private GetComplaintsTool complaintsTool;
    private GetPollResultsTool pollResultsTool;
    private GetMenuHistoryTool menuHistoryTool;
    private RunRootCauseTool rootCauseTool;
    private RunForecastTool forecastTool;
    private RunSimulationTool simulationTool;
    private CreateRecommendationTool recommendationTool;
    private CreateAdminTaskTool adminTaskTool;
    private SendNotificationTool notificationTool;

    @BeforeEach
    void setUp() {
        ratingsTool = new GetRecentRatingsTool(foodRepository);
        complaintsTool = new GetComplaintsTool(complaintRepository);
        pollResultsTool = new GetPollResultsTool(foodPollRepository, pollVoteRepository);
        menuHistoryTool = new GetMenuHistoryTool(dailyMenuRepository);
        rootCauseTool = new RunRootCauseTool(aiGatewayService);
        forecastTool = new RunForecastTool(aiGatewayService);
        simulationTool = new RunSimulationTool(aiGatewayService);
        recommendationTool = new CreateRecommendationTool();
        adminTaskTool = new CreateAdminTaskTool();
        notificationTool = new SendNotificationTool();

        List<AgentTool> tools = List.of(
                ratingsTool,
                complaintsTool,
                pollResultsTool,
                menuHistoryTool,
                rootCauseTool,
                forecastTool,
                simulationTool,
                recommendationTool,
                adminTaskTool,
                notificationTool
        );

        executor = new AgentToolExecutor(tools);
    }

    // =========================================================================
    // 1. Tool registry contains all 10 tools
    // =========================================================================
    @Test
    void executor_containsAllTenTools() {
        assertEquals(10, executor.getRegisteredTools().size());
        assertTrue(executor.isRegistered(AgentToolRegistry.GET_RECENT_RATINGS));
        assertTrue(executor.isRegistered(AgentToolRegistry.GET_COMPLAINTS));
        assertTrue(executor.isRegistered(AgentToolRegistry.GET_POLL_RESULTS));
        assertTrue(executor.isRegistered(AgentToolRegistry.GET_MENU_HISTORY));
        assertTrue(executor.isRegistered(AgentToolRegistry.RUN_ROOT_CAUSE));
        assertTrue(executor.isRegistered(AgentToolRegistry.RUN_FORECAST));
        assertTrue(executor.isRegistered(AgentToolRegistry.RUN_SIMULATION));
        assertTrue(executor.isRegistered(AgentToolRegistry.CREATE_RECOMMENDATION));
        assertTrue(executor.isRegistered(AgentToolRegistry.CREATE_ADMIN_TASK));
        assertTrue(executor.isRegistered(AgentToolRegistry.SEND_NOTIFICATION));
    }

    // =========================================================================
    // 2. Unknown tool name fails safely
    // =========================================================================
    @Test
    void execute_unknownTool_failsSafely() {
        ToolResult res = executor.execute("non_existent_tool", ToolInput.empty());
        assertNotNull(res);
        assertFalse(res.isSuccess());
        assertEquals("UNKNOWN_TOOL", res.getErrorCode());
        assertTrue(res.getErrorMessage().contains("non_existent_tool"));
    }

    @Test
    void execute_blankToolName_failsSafely() {
        ToolResult res = executor.execute("", ToolInput.empty());
        assertFalse(res.isSuccess());
        assertEquals("INVALID_TOOL_NAME", res.getErrorCode());
    }

    // =========================================================================
    // 3. ACTION tools cannot execute in Phase 2
    // =========================================================================
    @Test
    void execute_createRecommendation_blockedInPhase2() {
        ToolResult res = executor.execute(AgentToolRegistry.CREATE_RECOMMENDATION, ToolInput.empty());
        assertFalse(res.isSuccess());
        assertEquals("ACTION_EXECUTION_BLOCKED", res.getErrorCode());
        assertEquals(AgentToolType.ACTION, res.getToolType());
    }

    @Test
    void execute_createAdminTask_blockedInPhase2() {
        ToolResult res = executor.execute(AgentToolRegistry.CREATE_ADMIN_TASK, ToolInput.empty());
        assertFalse(res.isSuccess());
        assertEquals("ACTION_EXECUTION_BLOCKED", res.getErrorCode());
    }

    @Test
    void execute_sendNotification_blockedInPhase2() {
        ToolResult res = executor.execute(AgentToolRegistry.SEND_NOTIFICATION, ToolInput.empty());
        assertFalse(res.isSuccess());
        assertEquals("ACTION_EXECUTION_BLOCKED", res.getErrorCode());
    }

    @Test
    void actionToolDirectInvocation_alsoRejectsExecution() {
        ToolResult res1 = recommendationTool.execute(ToolInput.empty());
        assertFalse(res1.isSuccess());
        assertEquals("ACTION_NOT_PERMITTED", res1.getErrorCode());

        ToolResult res2 = adminTaskTool.execute(ToolInput.empty());
        assertFalse(res2.isSuccess());
        assertEquals("ACTION_NOT_PERMITTED", res2.getErrorCode());

        ToolResult res3 = notificationTool.execute(ToolInput.empty());
        assertFalse(res3.isSuccess());
        assertEquals("ACTION_NOT_PERMITTED", res3.getErrorCode());
    }

    // =========================================================================
    // 4. Read-only tools do not mutate operational data
    // =========================================================================
    @Test
    void getRecentRatings_readOnly_doesNotMutateData() {
        Object[] row = new Object[]{"Paneer Butter Masala", 4.2, 10L};
        List<Object[]> analytics = java.util.Collections.singletonList(row);
        when(foodRepository.getFoodAnalytics()).thenReturn(analytics);

        ToolResult res = executor.execute(AgentToolRegistry.GET_RECENT_RATINGS, ToolInput.of(Map.of("limit", "10")));

        assertTrue(res.isSuccess());
        assertEquals(AgentToolType.READ_ONLY, res.getToolType());
        verify(foodRepository, times(1)).getFoodAnalytics();
        verifyNoMoreInteractions(foodRepository);
    }

    @Test
    void getComplaints_readOnly_doesNotMutateData() {
        Complaint c = new Complaint();
        c.setType("HYGIENE");
        c.setDescription("Cold food");
        c.setRating(2);
        c.setResolved(false);

        when(complaintRepository.findAll(any(Sort.class))).thenReturn(List.of(c));

        ToolResult res = executor.execute(AgentToolRegistry.GET_COMPLAINTS, ToolInput.of(Map.of("resolved", "false")));

        assertTrue(res.isSuccess());
        assertEquals(AgentToolType.READ_ONLY, res.getToolType());
        verify(complaintRepository, times(1)).findAll(any(Sort.class));
        verifyNoMoreInteractions(complaintRepository);
    }

    @Test
    void getPollResults_readOnly_doesNotMutateData() {
        FoodPoll poll = new FoodPoll();
        poll.setId(10L);
        poll.setPollDate(LocalDate.now());
        poll.setActive(true);

        Object[] voteRow = new Object[]{"Biryani", 25L};
        List<Object[]> voteRows = java.util.Collections.singletonList(voteRow);

        when(foodPollRepository.findActivePollWithOptions()).thenReturn(Optional.of(poll));
        when(pollVoteRepository.getPollResults(10L)).thenReturn(voteRows);

        ToolResult res = executor.execute(AgentToolRegistry.GET_POLL_RESULTS, ToolInput.empty());

        assertTrue(res.isSuccess());
        assertEquals(AgentToolType.READ_ONLY, res.getToolType());
        verify(foodPollRepository, times(1)).findActivePollWithOptions();
        verify(pollVoteRepository, times(1)).getPollResults(10L);
        verify(foodPollRepository, never()).save(any());
        verify(pollVoteRepository, never()).save(any());
    }

    @Test
    void getMenuHistory_readOnly_doesNotMutateData() {
        DailyMenu m = new DailyMenu();
        m.setMenuDate(LocalDate.now());
        Food f = new Food();
        f.setId(1L);
        f.setName("Rajma Chawal");
        f.setMealType("LUNCH");
        m.setFood(f);

        when(dailyMenuRepository.findAll(any(Sort.class))).thenReturn(List.of(m));

        ToolResult res = executor.execute(AgentToolRegistry.GET_MENU_HISTORY, ToolInput.of(Map.of("limit", "15")));

        assertTrue(res.isSuccess());
        assertEquals(AgentToolType.READ_ONLY, res.getToolType());
        verify(dailyMenuRepository, times(1)).findAll(any(Sort.class));
        verify(dailyMenuRepository, never()).save(any());
    }

    // =========================================================================
    // 5. Existing Root Cause adapter invokes existing Root Cause capability
    // =========================================================================
    @Test
    void runRootCause_invokesExistingAiGatewayService() {
        when(aiGatewayService.runInvestigation(any()))
                .thenReturn(ResponseEntity.ok("{\"target_metric\":\"DINNER\",\"primary_factor\":\"Taste\"}"));

        ToolResult res = executor.execute(AgentToolRegistry.RUN_ROOT_CAUSE, ToolInput.of(Map.of(
                "startDate", "2026-09-01",
                "endDate", "2026-09-07"
        )));

        assertTrue(res.isSuccess());
        assertEquals("root_cause", res.getMetadata().get("engine"));
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(aiGatewayService, times(1)).runInvestigation(captor.capture());
        assertEquals("2026-09-01", captor.getValue().get("start_date"));
        assertEquals("2026-09-07", captor.getValue().get("end_date"));
    }

    // =========================================================================
    // 6. Existing Forecast adapter invokes existing Forecast capability
    // =========================================================================
    @Test
    void runForecast_invokesExistingAiGatewayService() {
        when(aiGatewayService.runForecast(any()))
                .thenReturn(ResponseEntity.ok("{\"point_prediction\":4.15}"));

        ToolResult res = executor.execute(AgentToolRegistry.RUN_FORECAST, ToolInput.of(Map.of(
                "foodName", "Chole Bhature",
                "horizonDays", "14"
        )));

        assertTrue(res.isSuccess());
        assertEquals("forecast", res.getMetadata().get("engine"));
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(aiGatewayService, times(1)).runForecast(captor.capture());
        assertEquals("Chole Bhature", captor.getValue().get("food_name"));
        assertEquals(14, captor.getValue().get("horizon_days"));
    }

    // =========================================================================
    // 7. Existing Simulation adapter invokes existing Simulation capability
    // =========================================================================
    @Test
    void runSimulation_invokesExistingAiGatewayService() {
        when(aiGatewayService.runSimulation(any()))
                .thenReturn(ResponseEntity.ok("{\"simulation_id\":\"sim-99\",\"risk_level\":\"LOW\"}"));

        ToolResult res = executor.execute(AgentToolRegistry.RUN_SIMULATION, ToolInput.of(Map.of(
                "scenarioName", "Weekend Special",
                "scenarioType", "FOOD_REPLACEMENT"
        )));

        assertTrue(res.isSuccess());
        assertEquals("simulation", res.getMetadata().get("engine"));
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(aiGatewayService, times(1)).runSimulation(captor.capture());
        assertEquals("Weekend Special", captor.getValue().get("scenario_name"));
        assertEquals("FOOD_REPLACEMENT", captor.getValue().get("scenario_type"));
    }

    // =========================================================================
    // 8. Invalid input is rejected
    // =========================================================================
    @Test
    void runRootCause_missingDates_rejected() {
        ToolResult res = executor.execute(AgentToolRegistry.RUN_ROOT_CAUSE, ToolInput.of(Map.of("startDate", "2026-09-01")));
        assertFalse(res.isSuccess());
        assertEquals("INVALID_INPUT", res.getErrorCode());
        verify(aiGatewayService, never()).runInvestigation(any());
    }

    @Test
    void runRootCause_startDateAfterEndDate_rejected() {
        ToolResult res = executor.execute(AgentToolRegistry.RUN_ROOT_CAUSE, ToolInput.of(Map.of(
                "startDate", "2026-09-10",
                "endDate", "2026-09-01"
        )));
        assertFalse(res.isSuccess());
        assertEquals("INVALID_INPUT", res.getErrorCode());
        verify(aiGatewayService, never()).runInvestigation(any());
    }

    @Test
    void runForecast_missingFoodName_rejected() {
        ToolResult res = executor.execute(AgentToolRegistry.RUN_FORECAST, ToolInput.empty());
        assertFalse(res.isSuccess());
        assertEquals("INVALID_INPUT", res.getErrorCode());
        verify(aiGatewayService, never()).runForecast(any());
    }

    @Test
    void runSimulation_disallowedScenarioType_rejected() {
        ToolResult res = executor.execute(AgentToolRegistry.RUN_SIMULATION, ToolInput.of(Map.of(
                "scenarioName", "Arbitrary scenario",
                "scenarioType", "ARBITRARY_UNSUPPORTED_TYPE"
        )));
        assertFalse(res.isSuccess());
        assertEquals("INVALID_INPUT", res.getErrorCode());
        verify(aiGatewayService, never()).runSimulation(any());
    }

    @Test
    void getRecentRatings_negativeLimit_rejected() {
        ToolResult res = executor.execute(AgentToolRegistry.GET_RECENT_RATINGS, ToolInput.of(Map.of("limit", "-5")));
        assertFalse(res.isSuccess());
        assertEquals("INVALID_INPUT", res.getErrorCode());
    }

    @Test
    void getComplaints_invalidResolvedValue_rejected() {
        ToolResult res = executor.execute(AgentToolRegistry.GET_COMPLAINTS, ToolInput.of(Map.of("resolved", "maybe")));
        assertFalse(res.isSuccess());
        assertEquals("INVALID_INPUT", res.getErrorCode());
    }

    @Test
    void getPollResults_negativePollId_rejected() {
        ToolResult res = executor.execute(AgentToolRegistry.GET_POLL_RESULTS, ToolInput.of(Map.of("pollId", "-1")));
        assertFalse(res.isSuccess());
        assertEquals("INVALID_INPUT", res.getErrorCode());
    }

    // =========================================================================
    // 9. AI Gateway errors are safely handled
    // =========================================================================
    @Test
    void runRootCause_gateway5xx_returnsControlledFailure() {
        when(aiGatewayService.runInvestigation(any()))
                .thenReturn(ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("AI service error"));

        ToolResult res = executor.execute(AgentToolRegistry.RUN_ROOT_CAUSE, ToolInput.of(Map.of(
                "startDate", "2026-09-01",
                "endDate", "2026-09-07"
        )));

        assertFalse(res.isSuccess());
        assertEquals("AI_ENGINE_ERROR", res.getErrorCode());
    }
}
