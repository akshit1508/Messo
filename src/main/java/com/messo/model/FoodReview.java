package com.messo.model;

import java.time.LocalDate;

import jakarta.persistence.*;

@Entity
@Table(
    name = "food_reviews",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "reviewDate"})
)
public class FoodReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Food food;

    @ManyToOne(optional = false)
    private User user;

    private int rating;

    private LocalDate reviewDate;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Food getFood() {
        return food;
    }

    public void setFood(Food food) {
        this.food = food;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public LocalDate getReviewDate() {
        return reviewDate;
    }

    public void setReviewDate(LocalDate reviewDate) {
        this.reviewDate = reviewDate;
    }

    // getters & setters
    
}
