package com.messo.controller;

import com.messo.service.AnnouncementService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/student")
public class StudentAnnouncementController {

    private final AnnouncementService service;

    public StudentAnnouncementController(AnnouncementService service) {
        this.service = service;
    }

    @GetMapping("/announcements")
    public String view(Model model) {
        model.addAttribute("announcements", service.getAll());
        return "student/announcements";
    }
}
