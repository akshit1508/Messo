package com.messo.service;

import com.messo.model.*;
import com.messo.repository.*;
import java.util.ArrayList;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class PollService {

    private final FoodPollRepository pollRepo;
    private final PollOptionRepository optionRepo;
    private final PollVoteRepository voteRepo;
    private final FoodRepository foodRepository;
    private final DailyMenuRepository dailyMenuRepository;

    // ✅ FINAL CONSTRUCTOR (ALL REPOS INJECTED)
    public PollService(FoodPollRepository pollRepo,
                       PollOptionRepository optionRepo,
                       PollVoteRepository voteRepo,
                       FoodRepository foodRepository,
                       DailyMenuRepository dailyMenuRepository) {

        this.pollRepo = pollRepo;
        this.optionRepo = optionRepo;
        this.voteRepo = voteRepo;
        this.foodRepository = foodRepository;
        this.dailyMenuRepository = dailyMenuRepository;
    }

    // =========================
    // ADMIN: CREATE POLL
    // =========================
    @Transactional
public FoodPoll createPoll(List<String> foods) {

    pollRepo.deactivateAllPolls();

    FoodPoll poll = new FoodPoll();
    poll.setPollDate(LocalDate.now().plusDays(1));
    poll.setActive(true);

    List<PollOption> options = new ArrayList<>();

    for (String food : foods) {
        if (food != null && !food.trim().isEmpty()) {
            PollOption option = new PollOption();
            option.setFoodName(food.trim());
            option.setPoll(poll);
            options.add(option);
        }
    }

    poll.setOptions(options);

    return pollRepo.save(poll);
}


    // =========================
    // STUDENT: GET ACTIVE POLL
    // =========================
    @Transactional(readOnly = true)
    public FoodPoll getActivePoll() {
        return pollRepo.findActivePollWithOptions().orElse(null);
    }

    // =========================
    // STUDENT: VOTE
    // =========================
    @Transactional
    public void vote(User user, Long optionId) {

        PollOption option = optionRepo.findById(optionId)
                .orElseThrow(() -> new RuntimeException("Invalid poll option"));

        FoodPoll poll = option.getPoll();

        if (!poll.isActive()) {
            throw new RuntimeException("Poll is closed");
        }

        if (voteRepo.existsByUserIdAndOptionPollId(user.getId(), poll.getId())) {
            throw new RuntimeException("You have already voted");
        }

        PollVote vote = new PollVote();
        vote.setUser(user);
        vote.setOption(option);

        voteRepo.save(vote);
    }

    // =========================
    // CHECK IF USER VOTED
    // =========================
    @Transactional(readOnly = true)
    public boolean hasUserVoted(String email, Long pollId) {
        return voteRepo.existsByUserEmailAndOptionPollId(email, pollId);
    }

    // =========================
    // ADMIN: POLL RESULTS
    // =========================
    @Transactional(readOnly = true)
    public List<Object[]> getPollResults(Long pollId) {
        return voteRepo.getPollResults(pollId);
    }

    // =========================
    // ADMIN: WINNING FOOD
    // =========================
    @Transactional(readOnly = true)
    public String getWinningFood(Long pollId) {

        return voteRepo.getPollResults(pollId)
                .stream()
                .max((a, b) -> Long.compare((Long) a[1], (Long) b[1]))
                .map(row -> (String) row[0])
                .orElse("No votes yet");
    }

    // =========================
    // ADMIN / SCHEDULER:
    // PUBLISH TOMORROW MENU
    // =========================
    @Transactional
public void publishTomorrowMenu() {

    FoodPoll poll = getActivePoll();
    if (poll == null) {
        throw new RuntimeException("No active poll found");
    }

    LocalDate tomorrow = LocalDate.now().plusDays(1);

    String winningFoodName = getWinningFood(poll.getId());

    Food food = foodRepository.findByNameIgnoreCase(winningFoodName)
            .orElseGet(() -> {
                Food newFood = new Food();
                newFood.setName(winningFoodName);
                newFood.setMealType("Lunch");
                return foodRepository.save(newFood);
            });

    // ✅ CHECK IF MENU EXISTS
    DailyMenu menu = dailyMenuRepository.findByMenuDate(tomorrow)
            .orElseGet(() -> {
                DailyMenu m = new DailyMenu();
                m.setMenuDate(tomorrow);
                return m;
            });

    // ✅ UPDATE OR INSERT
    menu.setFood(food);
    dailyMenuRepository.save(menu);

    // ✅ CLOSE POLL
    poll.setActive(false);
    pollRepo.save(poll);
}

}
