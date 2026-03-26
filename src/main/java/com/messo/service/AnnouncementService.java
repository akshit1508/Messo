package com.messo.service;

import com.messo.model.*;
import com.messo.repository.*;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementReadRepository announcementReadRepository;

    public AnnouncementService(
            AnnouncementRepository announcementRepository,
            AnnouncementReadRepository announcementReadRepository) {

        this.announcementRepository = announcementRepository;
        this.announcementReadRepository = announcementReadRepository;
    }

    // =========================
    // ADMIN: POST ANNOUNCEMENT
    // =========================
    public void post(String title, String message) {
        Announcement ann = new Announcement();
        ann.setTitle(title);
        ann.setMessage(message);
        announcementRepository.save(ann);
    }

    // =========================
    // STUDENT: DASHBOARD LIST
    // =========================
    public List<Announcement> getLatestForStudent(User user, int limit) {

        return announcementRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(a -> 
                    !announcementReadRepository.existsByUserAndAnnouncement(user, a)
                )
                .limit(limit)
                .toList();
    }

    // =========================
    // UNREAD COUNT (BELL)
    // =========================
    public long getUnreadCount(User user) {

        long total = announcementRepository.count();
        long read = announcementReadRepository.countByUser(user);

        return total - read;
    }
    public List<Announcement> getAll() {
    return announcementRepository.findAllByOrderByCreatedAtDesc();
}

}
