package com.messo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "poll_votes")
public class PollVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "option_id", nullable = false)
    private PollOption option;

    // ===== GETTERS =====
    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public PollOption getOption() {
        return option;
    }

    // ===== SETTERS =====
    public void setId(Long id) {
        this.id = id;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public void setOption(PollOption option) {
        this.option = option;
    }
}
