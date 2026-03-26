package com.messo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "student_notifications",
    uniqueConstraints = @UniqueConstraint(columnNames = {"student_id","announcement_id"})
)
public class StudentNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private User student;

    @ManyToOne(optional = false)
    @JoinColumn(name = "announcement_id")
    private Announcement announcement;

    private boolean isRead = false;

    private LocalDateTime createdAt = LocalDateTime.now();

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public User getStudent() { return student; }
    public Announcement getAnnouncement() { return announcement; }
    public boolean isRead() { return isRead; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setId(Long id) { this.id = id; }
    public void setStudent(User student) { this.student = student; }
    public void setAnnouncement(Announcement announcement) { this.announcement = announcement; }
    public void setRead(boolean read) { isRead = read; }
}
