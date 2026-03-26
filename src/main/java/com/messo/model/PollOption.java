package com.messo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "poll_options")
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String foodName;

   @ManyToOne(fetch = FetchType.EAGER)
@JoinColumn(name = "poll_id", nullable = false)
private FoodPoll poll;


    // getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFoodName() { return foodName; }
    public void setFoodName(String foodName) { this.foodName = foodName; }

    public FoodPoll getPoll() { return poll; }
    public void setPoll(FoodPoll poll) { this.poll = poll; }
}
