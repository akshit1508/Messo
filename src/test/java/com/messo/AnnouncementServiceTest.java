package com.messo;

import com.messo.model.Announcement;
import com.messo.model.AnnouncementRead;
import com.messo.model.User;
import com.messo.repository.AnnouncementReadRepository;
import com.messo.repository.AnnouncementRepository;
import com.messo.service.AnnouncementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnnouncementServiceTest {

    @Mock
    private AnnouncementRepository announcementRepository;
    @Mock
    private AnnouncementReadRepository announcementReadRepository;

    private AnnouncementService announcementService;

    @BeforeEach
    void setUp() {
        announcementService = new AnnouncementService(announcementRepository, announcementReadRepository);
    }

    @Test
    void testMarkAnnouncementAsRead_Idempotent_FirstTime_SavesRead() {
        User user = new User();
        user.setId(1L);

        Announcement announcement = new Announcement();
        announcement.setTitle("Test Announcement");

        when(announcementRepository.findById(5L)).thenReturn(Optional.of(announcement));
        when(announcementReadRepository.existsByUserAndAnnouncement(user, announcement)).thenReturn(false);

        announcementService.markAnnouncementAsRead(user, 5L);

        verify(announcementReadRepository, times(1)).save(any(AnnouncementRead.class));
    }

    @Test
    void testMarkAnnouncementAsRead_Idempotent_SecondTime_DoesNotSaveAgain() {
        User user = new User();
        user.setId(1L);

        Announcement announcement = new Announcement();
        announcement.setTitle("Test Announcement");

        when(announcementRepository.findById(5L)).thenReturn(Optional.of(announcement));
        when(announcementReadRepository.existsByUserAndAnnouncement(user, announcement)).thenReturn(true);

        announcementService.markAnnouncementAsRead(user, 5L);

        verify(announcementReadRepository, never()).save(any(AnnouncementRead.class));
    }

    @Test
    void testGetUnreadCount() {
        User user = new User();
        user.setId(1L);

        when(announcementRepository.count()).thenReturn(10L);
        when(announcementReadRepository.countByUser(user)).thenReturn(3L);

        long unread = announcementService.getUnreadCount(user);
        assertEquals(7L, unread);
    }
}
