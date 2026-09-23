package com.messo.dto;

import com.messo.model.Food;

public record FoodDto(
        Long id,
        String name,
        String mealType
) {
    public static FoodDto fromEntity(Food food) {
        if (food == null) return null;
        return new FoodDto(food.getId(), food.getName(), food.getMealType());
    }
}
