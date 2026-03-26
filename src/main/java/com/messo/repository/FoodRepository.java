package com.messo.repository;

import com.messo.model.Food;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FoodRepository extends JpaRepository<Food, Long> {

    Optional<Food> findByNameIgnoreCase(String name);

    // ===== ADMIN RATING ANALYTICS =====
    @Query("""
        SELECT f.name, AVG(r.rating), COUNT(r.id)
        FROM FoodReview r
        JOIN r.food f
        GROUP BY f.name
    """)
    List<Object[]> getFoodAnalytics();
}
