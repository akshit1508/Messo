package com.messo.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(
    name = "daily_menu",
    uniqueConstraints = @UniqueConstraint(columnNames = "menuDate")
)
public class DailyMenu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "food_id")
    private Food food;

    @Column(nullable = false)
    private LocalDate menuDate;

    // ===== GETTERS & SETTERS =====

    public Long getId() {
        return id;
    }

    public Food getFood() {
        return food;
    }

    public LocalDate getMenuDate() {
        return menuDate;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setFood(Food food) {
        this.food = food;
    }

    public void setMenuDate(LocalDate menuDate) {
        this.menuDate = menuDate;
    }
}
