package com.messo.repository;

import com.messo.model.Announcement;
import com.messo.model.AnnouncementRead;
import com.messo.model.User;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementReadRepository 
        extends JpaRepository<AnnouncementRead, Long> {

    boolean existsByUserAndAnnouncement(User user, Announcement announcement);

    long countByUser(User user);
}

