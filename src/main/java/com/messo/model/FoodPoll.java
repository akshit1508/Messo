package com.messo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "food_polls")
public class FoodPoll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate pollDate;

    private boolean active = true;

  @OneToMany(
    mappedBy = "poll",
    cascade = CascadeType.ALL,
    orphanRemoval = true,   // 🔥 IMPORTANT
    fetch = FetchType.EAGER
)
private List<PollOption> options;




    // getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getPollDate() { return pollDate; }
    public void setPollDate(LocalDate pollDate) { this.pollDate = pollDate; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public List<PollOption> getOptions() { return options; }
    public void setOptions(List<PollOption> options) { this.options = options; }
}
