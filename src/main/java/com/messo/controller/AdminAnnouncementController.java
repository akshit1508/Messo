package com.messo.controller;

import com.messo.service.AnnouncementService;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/admin")
public class AdminAnnouncementController {

    private final AnnouncementService service;

    public AdminAnnouncementController(AnnouncementService service) {
        this.service = service;
    }

    @GetMapping("/announcement")
    public String page() {
        return "admin/announcement";
    }

    @PostMapping("/announcement")
    public String post(@RequestParam String title,
                       @RequestParam String message) {

        service.post(title, message);
        return "redirect:/admin/dashboard";
    }
}
