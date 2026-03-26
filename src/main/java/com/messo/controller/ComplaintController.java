package com.messo.controller;

import com.messo.model.User;
import com.messo.service.ComplaintService;
import com.messo.repository.UserRepository;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/student")
public class ComplaintController {

    private final ComplaintService complaintService;
    private final UserRepository userRepository;

    public ComplaintController(
            ComplaintService complaintService,
            UserRepository userRepository) {
        this.complaintService = complaintService;
        this.userRepository = userRepository;
    }

    // ================= STUDENT =================

    @GetMapping("/complaint")
    public String complaintForm() {
        return "student/complaint";
    }

    @PostMapping("/complaint")
    public String submitComplaint(
            @RequestParam String type,
            @RequestParam String description,
            @RequestParam(required = false) Integer rating,
            Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        complaintService.submitComplaint(user, type, description, rating);

        return "redirect:/student/dashboard";
    }
}
