package com.messo.service;

import com.messo.model.Complaint;
import com.messo.model.Notification;
import com.messo.model.User;
import com.messo.repository.ComplaintRepository;
import com.messo.repository.NotificationRepository;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final NotificationRepository notificationRepository;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            NotificationRepository notificationRepository) {
        this.complaintRepository = complaintRepository;
        this.notificationRepository = notificationRepository;
    }

    // =========================
    // STUDENT: SUBMIT COMPLAINT
    // =========================
    public void submitComplaint(
            User user,
            String type,
            String description,
            Integer rating) {

        Complaint complaint = new Complaint();
        complaint.setUser(user);
        complaint.setType(type);
        complaint.setDescription(description);
        complaint.setRating(rating);
        complaint.setResolved(false);

        complaintRepository.save(complaint);
    }

    // =========================
    // ADMIN: VIEW ALL COMPLAINTS
    // =========================
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll(
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
    }

    public Complaint getById(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
    }

    // =========================
    // ADMIN: RESOLVE COMPLAINT
    // =========================
    public void markResolved(Long id) {

        Complaint complaint = getById(id);
        complaint.setResolved(true);
        complaintRepository.save(complaint);

        // 🔔 Notify student
        Notification notification = new Notification();
        notification.setUser(complaint.getUser());
        notification.setMessage(
                "✅ Your complaint on \"" + complaint.getType() + "\" has been resolved."
        );

        notificationRepository.save(notification);
    }

    // =========================
    // DASHBOARD COUNTS
    // =========================
    public long countAll() {
        return complaintRepository.count();
    }

    public long countPending() {
        return complaintRepository.countByResolvedFalse();
    }

    public long countResolved() {
        return complaintRepository.countByResolvedTrue();
    }
}
