package com.messo.agent.actionbrief;

/**
 * Controlled categorization of actions that the Agent can propose to human admins.
 *
 * <p>These represent proposal classifications only. They do not execute automatically.
 */
public enum ProposedActionType {

    /**
     * Recommends reviewing a potential menu modification (e.g. food substitution).
     */
    REVIEW_MENU_CHANGE,

    /**
     * Recommends investigating a recurring food preparation or recipe issue.
     */
    REVIEW_FOOD_ISSUE,

    /**
     * Recommends reviewing feedback themes or conducting a poll among students.
     */
    REVIEW_STUDENT_FEEDBACK,

    /**
     * Recommends creating an administrative follow-up task for cafeteria staff.
     */
    CREATE_ADMIN_FOLLOWUP,

    /**
     * Controlled operational menu modification (Phase 8).
     * Replaces an approved food item on a specific date and meal after human approval.
     */
    UPDATE_MENU
}
