package com.messo.controller.api;

import com.messo.dto.*;
import com.messo.model.DailyMenu;
import com.messo.model.Food;
import com.messo.model.FoodPoll;
import com.messo.model.Notification;
import com.messo.model.User;
import com.messo.repository.DailyMenuRepository;
import com.messo.repository.FoodRepository;
import com.messo.repository.FoodReviewRepository;
import com.messo.repository.NotificationRepository;
import com.messo.repository.UserRepository;
import com.messo.service.AnnouncementService;
import com.messo.service.ComplaintService;
import com.messo.service.FoodService;
import com.messo.service.PollService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/student")
public class StudentApiController {

    private final FoodService foodService;
    private final FoodRepository foodRepository;
    private final UserRepository userRepository;
    private final PollService pollService;
    private final DailyMenuRepository dailyMenuRepository;
    private final FoodReviewRepository foodReviewRepository;
    private final AnnouncementService announcementService;
    private final ComplaintService complaintService;
    private final NotificationRepository notificationRepository;

    public StudentApiController(FoodService foodService,
                                FoodRepository foodRepository,
                                UserRepository userRepository,
                                PollService pollService,
                                DailyMenuRepository dailyMenuRepository,
                                FoodReviewRepository foodReviewRepository,
                                AnnouncementService announcementService,
                                ComplaintService complaintService,
                                NotificationRepository notificationRepository) {
        this.foodService = foodService;
        this.foodRepository = foodRepository;
        this.userRepository = userRepository;
        this.pollService = pollService;
        this.dailyMenuRepository = dailyMenuRepository;
        this.foodReviewRepository = foodReviewRepository;
        this.announcementService = announcementService;
        this.complaintService = complaintService;
        this.notificationRepository = notificationRepository;
    }

    private User getAuthenticatedUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new IllegalArgumentException("Unauthenticated request");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + auth.getName()));
    }

    // ==========================================
    // DASHBOARD
    // ==========================================
    @GetMapping("/dashboard")
    public ResponseEntity<StudentDashboardResponse> getDashboard(Authentication auth) {
        User user = getAuthenticatedUser(auth);

        long unreadCount = announcementService.getUnreadCount(user);
        List<AnnouncementDto> latestAnnouncements = announcementService.getLatestForStudent(user, 5)
                .stream()
                .map(AnnouncementDto::fromEntity)
                .toList();

        List<NotificationDto> notifications = notificationRepository.findByUserAndReadFalse(user)
                .stream()
                .map(NotificationDto::fromEntity)
                .toList();

        return ResponseEntity.ok(new StudentDashboardResponse(unreadCount, latestAnnouncements, notifications));
    }

    // ==========================================
    // MENU & RATING
    // ==========================================
    @GetMapping("/menu/today")
    public ResponseEntity<TodayMenuResponse> getTodayMenu(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        LocalDate today = LocalDate.now();
        DailyMenu todayMenu = dailyMenuRepository.findByMenuDate(today).orElse(null);

        if (todayMenu == null || todayMenu.getFood() == null) {
            return ResponseEntity.ok(TodayMenuResponse.notServed());
        }

        boolean alreadyRated = foodReviewRepository.existsByUserIdAndReviewDate(user.getId(), today);
        return ResponseEntity.ok(TodayMenuResponse.of(FoodDto.fromEntity(todayMenu.getFood()), alreadyRated));
    }

    @GetMapping("/rating/today")
    public ResponseEntity<TodayMenuResponse> getTodayRatingInfo(Authentication auth) {
        return getTodayMenu(auth);
    }

    @PostMapping("/rating")
    public ResponseEntity<ApiResponse> submitRating(@Valid @RequestBody SubmitRatingRequest request,
                                                    Authentication auth) {
        User user = getAuthenticatedUser(auth);
        Food food = foodRepository.findById(request.foodId())
                .orElseThrow(() -> new IllegalArgumentException("Food item not found with ID: " + request.foodId()));

        foodService.addReview(food, user, request.rating());
        return ResponseEntity.ok(ApiResponse.ok("Rating submitted successfully"));
    }

    // ==========================================
    // TOMORROW'S MENU
    // ==========================================
    @GetMapping("/menu/tomorrow")
    public ResponseEntity<TomorrowMenuResponse> getTomorrowMenu() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        DailyMenu menu = dailyMenuRepository.findByMenuDate(tomorrow).orElse(null);

        if (menu == null || menu.getFood() == null) {
            return ResponseEntity.ok(TomorrowMenuResponse.notPublished(tomorrow));
        }

        return ResponseEntity.ok(TomorrowMenuResponse.of(FoodDto.fromEntity(menu.getFood()), tomorrow));
    }

    // ==========================================
    // POLL & VOTING
    // ==========================================
    @GetMapping("/poll")
    public ResponseEntity<PollResponse> getActivePoll(Authentication auth) {
        FoodPoll poll = pollService.getActivePoll();
        if (poll == null) {
            return ResponseEntity.ok(PollResponse.noActivePoll());
        }

        boolean alreadyVoted = pollService.hasUserVoted(auth.getName(), poll.getId());
        List<PollOptionDto> options = poll.getOptions() != null
                ? poll.getOptions().stream().map(PollOptionDto::fromEntity).toList()
                : List.of();

        return ResponseEntity.ok(PollResponse.active(poll.getId(), poll.getPollDate(), alreadyVoted, options));
    }

    @PostMapping("/poll/vote")
    public ResponseEntity<ApiResponse> vote(@Valid @RequestBody VoteRequest request,
                                            Authentication auth) {
        User user = getAuthenticatedUser(auth);
        pollService.vote(user, request.optionId());
        return ResponseEntity.ok(ApiResponse.ok("Vote submitted successfully"));
    }

    // ==========================================
    // ANNOUNCEMENTS
    // ==========================================
    @GetMapping("/announcements")
    public ResponseEntity<List<AnnouncementDto>> getAllAnnouncements() {
        List<AnnouncementDto> announcements = announcementService.getAll()
                .stream()
                .map(AnnouncementDto::fromEntity)
                .toList();
        return ResponseEntity.ok(announcements);
    }

    @PostMapping("/announcements/{id}/dismiss")
    public ResponseEntity<ApiResponse> dismissAnnouncement(@PathVariable Long id,
                                                           Authentication auth) {
        User user = getAuthenticatedUser(auth);
        announcementService.markAnnouncementAsRead(user, id);
        return ResponseEntity.ok(ApiResponse.ok("Announcement dismissed"));
    }

    // ==========================================
    // COMPLAINTS
    // ==========================================
    @PostMapping("/complaints")
    public ResponseEntity<ApiResponse> submitComplaint(@Valid @RequestBody ComplaintCreateRequest request,
                                                       Authentication auth) {
        User user = getAuthenticatedUser(auth);
        complaintService.submitComplaint(user, request.type(), request.description(), request.rating());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Complaint submitted successfully"));
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationDto>> getNotifications(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        List<NotificationDto> notifications = notificationRepository.findByUserAndReadFalse(user)
                .stream()
                .map(NotificationDto::fromEntity)
                .toList();
        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/notifications/{id}/dismiss")
    public ResponseEntity<ApiResponse> dismissNotification(@PathVariable Long id,
                                                           Authentication auth) {
        User user = getAuthenticatedUser(auth);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to dismiss this notification");
        }

        notificationRepository.delete(notification);
        return ResponseEntity.ok(ApiResponse.ok("Notification dismissed"));
    }
}
