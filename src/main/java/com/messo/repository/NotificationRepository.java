package com.messo.repository;

import com.messo.model.Notification;
import com.messo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserAndReadFalse(User user);
}
