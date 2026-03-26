package com.messo.controller;

import com.messo.service.UserService;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class SignupController {

    private final UserService userService;

    public SignupController(UserService userService) {
        this.userService = userService;
    }

    // ✅ OPEN SIGNUP PAGE
    @GetMapping("/signup")
    public String signupPage() {
        return "signup"; // signup.html
    }

    // ✅ HANDLE SIGNUP FORM
    @PostMapping("/signup")
    public String register(
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam String role
    ) {
        userService.register(email, password, role);
        return "redirect:/login";
    }
}
