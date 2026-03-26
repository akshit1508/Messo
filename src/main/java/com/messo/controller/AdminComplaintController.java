package com.messo.controller;

import com.messo.service.ComplaintService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/admin")
public class AdminComplaintController {

    private final ComplaintService complaintService;

    public AdminComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    // LIST
    @GetMapping("/complaints")
    public String complaints(Model model) {
        model.addAttribute("complaints", complaintService.getAllComplaints());
        return "admin/complaints";
    }

    // VIEW SINGLE COMPLAINT
    @GetMapping("/complaints/{id}")
    public String viewComplaint(@PathVariable Long id, Model model) {
        model.addAttribute("complaint", complaintService.getById(id));
        return "admin/complaint-detail";
    }

    // RESOLVE
    @PostMapping("/complaint/resolve/{id}")
    public String resolve(@PathVariable Long id) {
        complaintService.markResolved(id);
        return "redirect:/admin/complaints";
    }
}
