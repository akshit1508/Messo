package com.messo.repository;

import com.messo.model.StudentProfile;
import com.messo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    boolean existsByStudentId(String studentId);
    Optional<StudentProfile> findByStudentId(String studentId);
    Optional<StudentProfile> findByUser(User user);
}
