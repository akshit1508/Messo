package com.messo.controller.api;

import com.messo.dto.*;
import com.messo.model.FoodPoll;
import com.messo.repository.FoodPollRepository;
import com.messo.repository.FoodRepository;
import com.messo.service.AnnouncementService;
import com.messo.service.ComplaintService;
import com.messo.service.PollService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminApiController {

    private final PollService pollService;
    private final FoodRepository foodRepository;
    private final FoodPollRepository pollRepository;
    private final ComplaintService complaintService;
    private final AnnouncementService announcementService;

    public AdminApiController(PollService pollService,
                              FoodRepository foodRepository,
                              FoodPollRepository pollRepository,
                              ComplaintService complaintService,
                              AnnouncementService announcementService) {
        this.pollService = pollService;
        this.foodRepository = foodRepository;
        this.pollRepository = pollRepository;
        this.complaintService = complaintService;
        this.announcementService = announcementService;
    }

    // ==========================================
    // DASHBOARD
    // ==========================================
    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        FoodPoll poll = pollService.getActivePoll();
        boolean pollActive = (poll != null);

        long total = complaintService.countAll();
        long pending = complaintService.countPending();
        long resolved = complaintService.countResolved();

        return ResponseEntity.ok(new AdminDashboardResponse(pollActive, total, pending, resolved));
    }

    // ==========================================
    // POLLS
    // ==========================================
    @PostMapping("/polls")
    public ResponseEntity<ApiResponse> createPoll(@Valid @RequestBody CreatePollRequest request) {
        FoodPoll poll = pollService.createPoll(request.foods());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Poll created successfully with " + poll.getOptions().size() + " options"));
    }

    @GetMapping("/polls/{id}/results")
    public ResponseEntity<PollResultResponse> getPollResults(@PathVariable Long id) {
        FoodPoll poll = pollRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Poll not found with ID: " + id));

        List<Object[]> rawResults = pollService.getPollResults(id);
        long totalVotes = 0;
        for (Object[] row : rawResults) {
            if (row[1] != null) {
                totalVotes += ((Number) row[1]).longValue();
            }
        }

        List<PollOptionResultDto> results = new ArrayList<>();
        for (Object[] row : rawResults) {
            String foodName = (String) row[0];
            long votes = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            double percentage = totalVotes > 0 ? Math.round(((double) votes / totalVotes) * 1000.0) / 10.0 : 0.0;
            results.add(new PollOptionResultDto(foodName, votes, percentage));
        }

        String winner = pollService.getWinningFood(id);
        return ResponseEntity.ok(new PollResultResponse(id, poll.isActive(), winner, totalVotes, results));
    }

    @GetMapping("/polls/active/results")
    public ResponseEntity<PollResultResponse> getActivePollResults() {
        FoodPoll poll = pollService.getActivePoll();
        if (poll == null) {
            return ResponseEntity.ok(new PollResultResponse(null, false, null, 0, List.of()));
        }
        return getPollResults(poll.getId());
    }

    @PostMapping("/polls/{id}/publish")
    public ResponseEntity<ApiResponse> publishPollMenu(@PathVariable Long id) {
        pollService.publishTomorrowMenu(id);
        return ResponseEntity.ok(ApiResponse.ok("Tomorrow's menu published successfully"));
    }

    @PostMapping("/polls/publish")
    public ResponseEntity<ApiResponse> publishActivePollMenu() {
        pollService.publishTomorrowMenu();
        return ResponseEntity.ok(ApiResponse.ok("Tomorrow's menu published successfully"));
    }

    // ==========================================
    // COMPLAINTS
    // ==========================================
    @GetMapping("/complaints")
    public ResponseEntity<List<ComplaintResponse>> getAllComplaints() {
        List<ComplaintResponse> complaints = complaintService.getAllComplaints()
                .stream()
                .map(ComplaintResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(complaints);
    }

    @GetMapping("/complaints/{id}")
    public ResponseEntity<ComplaintResponse> getComplaintDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ComplaintResponse.fromEntity(complaintService.getById(id)));
    }

    @PostMapping("/complaints/{id}/resolve")
    public ResponseEntity<ApiResponse> resolveComplaint(@PathVariable Long id) {
        complaintService.markResolved(id);
        return ResponseEntity.ok(ApiResponse.ok("Complaint marked as resolved"));
    }

    // ==========================================
    // ANNOUNCEMENTS
    // ==========================================
    @PostMapping("/announcements")
    public ResponseEntity<ApiResponse> postAnnouncement(@Valid @RequestBody AnnouncementCreateRequest request) {
        announcementService.post(request.title(), request.message());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Announcement posted successfully"));
    }

    // ==========================================
    // RATINGS & ANALYTICS
    // ==========================================
    @GetMapping("/ratings")
    public ResponseEntity<List<FoodAnalyticsResponse>> getFoodRatingAnalytics() {
        List<Object[]> rawStats = foodRepository.getFoodAnalytics();
        List<FoodAnalyticsResponse> stats = new ArrayList<>();

        for (Object[] row : rawStats) {
            String foodName = (String) row[0];
            double avg = row[1] != null ? Math.round(((Number) row[1]).doubleValue() * 10.0) / 10.0 : 0.0;
            long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            stats.add(new FoodAnalyticsResponse(foodName, avg, count));
        }

        return ResponseEntity.ok(stats);
    }
}
