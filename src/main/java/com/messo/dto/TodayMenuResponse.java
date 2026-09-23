package com.messo.dto;

public record TodayMenuResponse(
        boolean served,
        String message,
        FoodDto food,
        boolean alreadyRated
) {
    public static TodayMenuResponse notServed() {
        return new TodayMenuResponse(false, "No food served today", null, false);
    }

    public static TodayMenuResponse of(FoodDto food, boolean alreadyRated) {
        return new TodayMenuResponse(true, "Today's food menu", food, alreadyRated);
    }
}
