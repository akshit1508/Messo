package com.messo.service;

import com.messo.model.*;
import com.messo.repository.*;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class FoodService {

    private final FoodRepository foodRepository;
    private final FoodReviewRepository reviewRepository;

    public FoodService(FoodRepository foodRepository,
                       FoodReviewRepository reviewRepository) {
        this.foodRepository = foodRepository;
        this.reviewRepository = reviewRepository;
    }

    public List<Food> getAllFoods() {
        return foodRepository.findAll();
    }

    public void addFood(String name, String mealType) {
        Food food = new Food();
        food.setName(name);
        food.setMealType(mealType);
        foodRepository.save(food);
    }

   @Transactional
public void addReview(Food food, User user, int rating) {

    LocalDate today = LocalDate.now();

    if (reviewRepository.existsByUserIdAndReviewDate(user.getId(), today)) {
        throw new RuntimeException("You have already rated today’s food");
    }

    FoodReview review = new FoodReview();
    review.setFood(food);
    review.setUser(user);
    review.setRating(rating);
    review.setReviewDate(today);

    reviewRepository.save(review);
}

}
