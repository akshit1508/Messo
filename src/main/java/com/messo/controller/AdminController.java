package com.messo.controller;

import com.messo.model.FoodPoll;
import com.messo.service.PollService;
import com.messo.service.ComplaintService;
import com.messo.repository.FoodRepository;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final PollService pollService;
    private final FoodRepository foodRepository;
    private final ComplaintService complaintService;

    // ✅ SINGLE CLEAN CONSTRUCTOR
    public AdminController(
            PollService pollService,
            FoodRepository foodRepository,
            ComplaintService complaintService) {

        this.pollService = pollService;
        this.foodRepository = foodRepository;
        this.complaintService = complaintService;
    }

    // =========================
    // ADMIN DASHBOARD (ONLY ONE)
    // =========================
    @GetMapping("/dashboard")
    public String dashboard(Model model) {

        FoodPoll poll = pollService.getActivePoll();

        model.addAttribute("pollActive", poll != null);

        // Complaint analytics
        model.addAttribute("totalComplaints", complaintService.countAll());
        model.addAttribute("pendingComplaints", complaintService.countPending());
        model.addAttribute("resolvedComplaints", complaintService.countResolved());

        return "admin/dashboard";
    }

    // =========================
    // CREATE POLL PAGE
    // =========================
    @GetMapping("/create-poll")
    public String createPollPage() {
        return "admin/create-poll";
    }

    // =========================
    // HANDLE CREATE POLL
    // =========================
    @PostMapping("/poll/create")
    public String createPoll(@RequestParam List<String> foods) {
        pollService.createPoll(foods);
        return "redirect:/admin/dashboard";
    }

    // =========================
    // VIEW POLL RESULTS
    // =========================
    @GetMapping("/poll/results")
    public String pollResults(Model model) {

        FoodPoll poll = pollService.getActivePoll();

        if (poll == null) {
            model.addAttribute("message", "No active poll");
            return "admin/results";
        }

        model.addAttribute("results", pollService.getPollResults(poll.getId()));
        model.addAttribute("winner", pollService.getWinningFood(poll.getId()));

        return "admin/results";
    }

    // =========================
    // PUBLISH TOMORROW MENU
    // =========================
    @PostMapping("/poll/publish")
    public String publishTomorrowMenu() {
        pollService.publishTomorrowMenu();
        return "redirect:/admin/dashboard";
    }

    // =========================
    // FOOD RATING ANALYTICS
    // =========================
    @GetMapping("/ratings")
    public String ratingAnalytics(Model model) {
        model.addAttribute("stats", foodRepository.getFoodAnalytics());
        return "admin/ratings";
    }
   

}
