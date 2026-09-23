package com.messo;

import com.messo.model.DailyMenu;
import com.messo.model.Food;
import com.messo.model.FoodPoll;
import com.messo.model.PollOption;
import com.messo.repository.*;
import com.messo.service.PollService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PollServiceTest {

    @Mock
    private FoodPollRepository pollRepo;
    @Mock
    private PollOptionRepository optionRepo;
    @Mock
    private PollVoteRepository voteRepo;
    @Mock
    private FoodRepository foodRepository;
    @Mock
    private DailyMenuRepository dailyMenuRepository;

    private PollService pollService;

    @BeforeEach
    void setUp() {
        pollService = new PollService(pollRepo, optionRepo, voteRepo, foodRepository, dailyMenuRepository);
    }

    @Test
    void testCreatePoll_Success() {
        List<String> foods = List.of("Dal Makhani", "Paneer Tikka");
        when(pollRepo.save(any(FoodPoll.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FoodPoll result = pollService.createPoll(foods);

        assertNotNull(result);
        assertTrue(result.isActive());
        assertEquals(2, result.getOptions().size());
        verify(pollRepo).deactivateAllPolls();
        verify(pollRepo).save(any(FoodPoll.class));
    }

    @Test
    void testGetWinningFood_WhenVotesExist() {
        List<Object[]> results = new ArrayList<>();
        results.add(new Object[]{"Paneer", 15L});
        results.add(new Object[]{"Dal", 25L});

        when(voteRepo.getPollResults(1L)).thenReturn(results);

        String winner = pollService.getWinningFood(1L);
        assertEquals("Dal", winner);
    }

    @Test
    void testGetWinningFood_WhenNoVotes_ReturnsNull() {
        when(voteRepo.getPollResults(1L)).thenReturn(List.of());

        String winner = pollService.getWinningFood(1L);
        assertNull(winner);
    }

    @Test
    void testPublishTomorrowMenu_ZeroVotes_ThrowsIllegalStateException() {
        FoodPoll poll = new FoodPoll();
        poll.setId(10L);
        poll.setActive(true);

        when(pollRepo.findActivePollWithOptions()).thenReturn(Optional.of(poll));
        when(pollRepo.findById(10L)).thenReturn(Optional.of(poll));
        when(voteRepo.getPollResults(10L)).thenReturn(List.of());

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            pollService.publishTomorrowMenu();
        });

        assertTrue(ex.getMessage().contains("No votes have been cast"));
        verify(dailyMenuRepository, never()).save(any(DailyMenu.class));
    }

    @Test
    void testPublishTomorrowMenu_WithVotes_PublishesSuccessfully() {
        FoodPoll poll = new FoodPoll();
        poll.setId(10L);
        poll.setActive(true);
        poll.setPollDate(LocalDate.now().plusDays(1));

        List<Object[]> results = new ArrayList<>();
        results.add(new Object[]{"Paneer Butter Masala", 10L});
        when(pollRepo.findActivePollWithOptions()).thenReturn(Optional.of(poll));
        when(pollRepo.findById(10L)).thenReturn(Optional.of(poll));
        when(voteRepo.getPollResults(10L)).thenReturn(results);

        Food food = new Food();
        food.setName("Paneer Butter Masala");
        when(foodRepository.findByNameIgnoreCase("Paneer Butter Masala")).thenReturn(Optional.of(food));
        when(dailyMenuRepository.findByMenuDate(any(LocalDate.class))).thenReturn(Optional.empty());
        when(dailyMenuRepository.save(any(DailyMenu.class))).thenAnswer(invocation -> invocation.getArgument(0));

        pollService.publishTomorrowMenu();

        assertFalse(poll.isActive());
        verify(dailyMenuRepository).save(any(DailyMenu.class));
        verify(pollRepo).save(poll);
    }
}
