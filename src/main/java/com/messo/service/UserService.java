package com.messo.service;

import com.messo.model.StudentProfile;
import com.messo.model.User;
import com.messo.repository.StudentProfileRepository;
import com.messo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       StudentProfileRepository studentProfileRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User register(String email, String password, String role) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (userRepository.findByEmail(email.trim()).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        // Security enforcement: public registration cannot grant ROLE_ADMIN
        String assignedRole = "ROLE_STUDENT";

        User user = new User();
        user.setEmail(email.trim());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(assignedRole);
        user.setEnabled(true);
        return userRepository.save(user);
    }

    @Transactional
    public User registerStudent(String email, String password, String name,
                                String studentId, String hostel, String phone) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (userRepository.findByEmail(email.trim()).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        User user = new User();
        user.setEmail(email.trim());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("ROLE_STUDENT");
        user.setEnabled(true);
        User savedUser = userRepository.save(user);

        if (studentId != null && !studentId.trim().isEmpty()) {
            String trimmedStudentId = studentId.trim();
            if (studentProfileRepository.existsByStudentId(trimmedStudentId)) {
                throw new IllegalArgumentException("Student ID is already registered");
            }
            StudentProfile profile = new StudentProfile();
            profile.setUser(savedUser);
            profile.setName(name != null ? name.trim() : null);
            profile.setStudentId(trimmedStudentId);
            profile.setHostel(hostel != null ? hostel.trim() : null);
            profile.setPhoneNumber(phone != null ? phone.trim() : null);
            studentProfileRepository.save(profile);
        }

        return savedUser;
    }
}
