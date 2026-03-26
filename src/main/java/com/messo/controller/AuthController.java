package com.messo.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AuthController {

    // ✅ LOGIN PAGE
    @GetMapping("/login")
    public String login() {
        return "login";   // login.html
    }

    @GetMapping("/redirect")
public String redirectAfterLogin(Authentication auth) {

    if (auth == null || auth.getAuthorities() == null) {
        return "redirect:/login";
    }

    for (GrantedAuthority authority : auth.getAuthorities()) {

        System.out.println("ROLE FOUND: " + authority.getAuthority());

        if (authority.getAuthority().equals("ROLE_ADMIN")) {
            return "redirect:/admin/dashboard";
        }

        if (authority.getAuthority().equals("ROLE_STUDENT")) {
            return "redirect:/student/dashboard";
        }
    }
    System.out.println("AUTH OBJECT = " + auth);
System.out.println("AUTHORITIES = " + auth.getAuthorities());


    return "redirect:/login";
}

}
