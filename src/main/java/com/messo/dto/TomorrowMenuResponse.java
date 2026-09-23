package com.messo.dto;

import java.time.LocalDate;

public record TomorrowMenuResponse(
        boolean published,
        String message,
        FoodDto food,
        LocalDate date
) {
    public static TomorrowMenuResponse notPublished(LocalDate date) {
        return new TomorrowMenuResponse(false, "Tomorrow’s menu is not published yet", null, date);
    }

    public static TomorrowMenuResponse of(FoodDto food, LocalDate date) {
        return new TomorrowMenuResponse(true, "Tomorrow's menu", food, date);
    }
}
