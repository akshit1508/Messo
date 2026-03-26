package com.messo.repository;

import com.messo.model.FoodPoll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface FoodPollRepository extends JpaRepository<FoodPoll, Long> {

    // 🔥 CRITICAL FIX
    @Query("""
        SELECT p FROM FoodPoll p
        LEFT JOIN FETCH p.options
        WHERE p.active = true
    """)
    Optional<FoodPoll> findActivePollWithOptions();

    @Query("UPDATE FoodPoll p SET p.active = false")
    @org.springframework.data.jpa.repository.Modifying
    void deactivateAllPolls();
}
