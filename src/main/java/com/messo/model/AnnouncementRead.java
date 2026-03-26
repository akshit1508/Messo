package com.messo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "announcement_reads",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"announcement_id", "user_id"}
    )
)
public class AnnouncementRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Announcement announcement;

    @ManyToOne(optional = false)
    private User user;

    private LocalDateTime readAt = LocalDateTime.now();

    // getters & setters
    public Long getId() { return id; }
    public Announcement getAnnouncement() { return announcement; }
    public User getUser() { return user; }
    public LocalDateTime getReadAt() { return readAt; }

    public void setId(Long id) { this.id = id; }
    public void setAnnouncement(Announcement announcement) { this.announcement = announcement; }
    public void setUser(User user) { this.user = user; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
