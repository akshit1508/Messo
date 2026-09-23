package com.messo;

import com.messo.model.StudentProfile;
import com.messo.model.User;
import com.messo.repository.StudentProfileRepository;
import com.messo.repository.UserRepository;
import com.messo.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, studentProfileRepository, passwordEncoder);
    }

    @Test
    void testRegister_EnforcesRoleStudent_EvenIfAdminRolePassed() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret")).thenReturn("hashed_secret");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.register("test@example.com", "secret", "ROLE_ADMIN");

        assertEquals("ROLE_STUDENT", user.getRole(), "Public register must enforce ROLE_STUDENT");
        assertEquals("test@example.com", user.getEmail());
    }

    @Test
    void testRegister_DuplicateEmail_ThrowsIllegalArgumentException() {
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(new User()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            userService.register("existing@example.com", "secret", "ROLE_STUDENT");
        });

        assertTrue(ex.getMessage().contains("already exists"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegisterStudent_WithProfile_SavesBothUserAndProfile() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret")).thenReturn("hashed_secret");
        when(studentProfileRepository.existsByStudentId("STU123")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.registerStudent("john@example.com", "secret", "John Doe", "STU123", "Hostel A", "1234567890");

        assertNotNull(user);
        assertEquals("ROLE_STUDENT", user.getRole());
        verify(studentProfileRepository).save(any(StudentProfile.class));
    }

    @Test
    void testRegisterStudent_DuplicateStudentId_ThrowsException() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret")).thenReturn("hashed_secret");
        when(studentProfileRepository.existsByStudentId("STU123")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            userService.registerStudent("john@example.com", "secret", "John Doe", "STU123", "Hostel A", "1234567890");
        });

        assertTrue(ex.getMessage().contains("Student ID is already registered"));
        verify(studentProfileRepository, never()).save(any(StudentProfile.class));
    }
}
