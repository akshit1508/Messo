package com.messo.controller;

import com.messo.model.*;
import com.messo.repository.*;
import com.messo.service.*;

import java.time.LocalDate;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/student")
public class StudentController {

    private final FoodService foodService;
    private final FoodRepository foodRepository;
    private final UserRepository userRepository;
    private final PollService pollService;
    private final DailyMenuRepository dailyMenuRepository;
    private final FoodReviewRepository foodReviewRepository;
    private final AnnouncementService announcementService;
    private final AnnouncementRepository announcementRepository;
    private final AnnouncementReadRepository announcementReadRepository;
    private final NotificationRepository notificationRepository;

    // ✅ FIXED CONSTRUCTOR (ALL DEPENDENCIES INJECTED)
    public StudentController(
            FoodService foodService,
            FoodRepository foodRepository,
            UserRepository userRepository,
            PollService pollService,
            DailyMenuRepository dailyMenuRepository,
            FoodReviewRepository foodReviewRepository,
            AnnouncementService announcementService,
            AnnouncementRepository announcementRepository,
            AnnouncementReadRepository announcementReadRepository,
            NotificationRepository notificationRepository
    ) {
        this.foodService = foodService;
        this.foodRepository = foodRepository;
        this.userRepository = userRepository;
        this.pollService = pollService;
        this.dailyMenuRepository = dailyMenuRepository;
        this.foodReviewRepository = foodReviewRepository;
        this.announcementService = announcementService;
        this.announcementRepository = announcementRepository;
        this.announcementReadRepository = announcementReadRepository;
        this.notificationRepository = notificationRepository;
    }

    // =========================
    // STUDENT DASHBOARD
    // =========================
    @GetMapping("/dashboard")
    public String dashboard(Authentication auth, Model model) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        model.addAttribute(
                "announcements",
                announcementService.getLatestForStudent(user, 5)
        );

        model.addAttribute(
                "unreadCount",
                announcementService.getUnreadCount(user)
        );

        // ✅ Complaint resolved notifications
        model.addAttribute(
                "notifications",
                notificationRepository.findByUserAndReadFalse(user)
        );

        return "student/dashboard";
    }

    // =========================
    // RATE TODAY'S FOOD
    // =========================
   @GetMapping("/rate")
public String rateFood(Model model, Authentication auth) {

    User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

    LocalDate today = LocalDate.now();
    DailyMenu todayMenu = dailyMenuRepository.findByMenuDate(today).orElse(null);

    if (todayMenu == null) {
        model.addAttribute("message", "No food served today");
        return "student/rate";
    }

    boolean alreadyRated =
            foodReviewRepository.existsByUserIdAndReviewDate(user.getId(), today);

    model.addAttribute("food", todayMenu.getFood());
    model.addAttribute("alreadyRated", alreadyRated);
    model.addAttribute("ratingExpired", false);

    return "student/rate";
}

@PostMapping("/rate")
public String submitRating(
        @RequestParam Long foodId,
        @RequestParam int rating,
        Authentication auth) {

    User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

    Food food = foodRepository.findById(foodId)
            .orElseThrow(() -> new RuntimeException("Food not found"));

    foodService.addReview(food, user, rating);

    return "redirect:/student/dashboard";
}


    // =========================
    // SHOW POLL
    // =========================
    @GetMapping("/poll")
    public String showPollPage(Model model, Authentication auth) {

        FoodPoll poll = pollService.getActivePoll();
        boolean alreadyVoted = false;

        if (poll != null) {
            alreadyVoted = pollService.hasUserVoted(
                    auth.getName(), poll.getId()
            );
        }

        model.addAttribute("poll", poll);
        model.addAttribute("alreadyVoted", alreadyVoted);

        if (poll == null || poll.getOptions().isEmpty()) {
            model.addAttribute("message", "No active poll available");
        }

        return "student/poll";
    }

    // =========================
    // VOTE
    // =========================
    @PostMapping("/poll/vote")
    public String vote(@RequestParam Long optionId, Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        pollService.vote(user, optionId);

        return "redirect:/student/poll";
    }

    // =========================
    // TOMORROW'S MENU
    // =========================
    @GetMapping("/tomorrow")
    public String viewTomorrowMenu(Model model) {

        LocalDate tomorrow = LocalDate.now().plusDays(1);

        DailyMenu menu =
                dailyMenuRepository.findByMenuDate(tomorrow).orElse(null);

        if (menu == null) {
            model.addAttribute(
                    "message",
                    "Tomorrow’s menu is not published yet"
            );
            return "student/tomorrow";
        }

        model.addAttribute("food", menu.getFood());
        model.addAttribute("date", tomorrow);

        return "student/tomorrow";
    }

    // =========================
    // DISMISS ANNOUNCEMENT
    // =========================
    @PostMapping("/announcement/delete/{id}")
    public String deleteAnnouncementForStudent(
            @PathVariable Long id,
            Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow();

        Announcement ann =
                announcementRepository.findById(id).orElseThrow();

        AnnouncementRead read = new AnnouncementRead();
        read.setUser(user);
        read.setAnnouncement(ann);

        announcementReadRepository.save(read);

        return "redirect:/student/dashboard";
    }
    @PostMapping("/notification/delete/{id}")
public String deleteNotification(
        @PathVariable Long id,
        Authentication auth) {

    User user = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

    Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

    // Security check
    if (!notification.getUser().getId().equals(user.getId())) {
        throw new RuntimeException("Unauthorized");
    }

    notificationRepository.delete(notification);

    return "redirect:/student/dashboard";
}

}
