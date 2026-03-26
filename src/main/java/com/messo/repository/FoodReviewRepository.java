package com.messo.repository;

import com.messo.model.FoodReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface FoodReviewRepository extends JpaRepository<FoodReview, Long> {

    boolean existsByUserIdAndReviewDate(Long userId, LocalDate reviewDate);
}
