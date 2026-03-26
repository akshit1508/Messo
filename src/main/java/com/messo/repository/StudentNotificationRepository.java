package com.messo.repository;

import com.messo.model.StudentNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentNotificationRepository
        extends JpaRepository<StudentNotification, Long> {

    List<StudentNotification> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    long countByStudentIdAndIsReadFalse(Long studentId);
}
