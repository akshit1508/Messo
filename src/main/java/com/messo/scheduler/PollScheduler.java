package com.messo.scheduler;

import com.messo.service.PollService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PollScheduler {

    private final PollService pollService;

    public PollScheduler(PollService pollService) {
        this.pollService = pollService;
    }

    // Runs every day at 11 PM
    @Scheduled(cron = "0 0 23 * * ?")
    public void autoPublishTomorrowMenu() {
        try {
            pollService.publishTomorrowMenu();
        } catch (Exception e) {
            System.err.println("Scheduled auto-publish tomorrow menu skipped: " + e.getMessage());
        }
    }
}
