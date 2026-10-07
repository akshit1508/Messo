/**
 * Centralized humanized display mappings for MESO AI Operations Agent.
 * Translates backend enum identifiers, machine names, and raw tool tags into natural, calm English.
 * Internal API and DB contracts remain untouched.
 * Hot-module-reloading verified.
 */

export const STATUS_DISPLAY_MAP: Record<string, string> = {
  PENDING: "Starting",
  RUNNING: "Investigating",
  WAITING_FOR_APPROVAL: "Awaiting your review",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  CANCELLED: "Not approved",
  FAILED: "Could not complete",
  PENDING_REVIEW: "Awaiting review",
  READY_FOR_IMPLEMENTATION: "Ready to put into action",
  READY_FOR_VERIFICATION: "Ready for verification",
};

export const ACTION_TYPE_DISPLAY_MAP: Record<string, string> = {
  REVIEW_MENU_CHANGE: "Review a menu change",
  REVIEW_FOOD_ISSUE: "Review a food issue",
  REVIEW_STUDENT_FEEDBACK: "Review student feedback",
  CREATE_ADMIN_FOLLOWUP: "Create an admin follow-up",
  UPDATE_MENU: "Update menu",
};

export const TOOL_DISPLAY_MAP: Record<string, string> = {
  get_recent_ratings: "Recent food ratings",
  get_complaints: "Recent complaints",
  get_poll_results: "Student poll results",
  get_menu_history: "Menu history",
  run_root_cause: "Root cause analysis",
  run_prediction: "Rating forecast",
  run_forecast: "Rating forecast",
  run_simulation: "Menu scenario comparison",
  create_recommendation: "Create recommendation",
  create_admin_task: "Create admin task",
  send_notification: "Send notification",
};

export const GOAL_TYPE_DISPLAY_MAP: Record<string, string> = {
  INVESTIGATE_OPERATIONAL_ISSUE: "Investigate a food service issue",
  INVESTIGATE_RATING_DROP: "Investigate rating decline",
  INVESTIGATE_COMPLAINT_SPIKE: "Investigate complaint surge",
  REVIEW_MENU_PERFORMANCE: "Review menu performance",
  MENU_REPETITION_AND_STUDENT_FATIGUE: "Menu repetition & student fatigue",
};

export const TARGET_DISPLAY_MAP: Record<string, string> = {
  DINNER_SATISFACTION: "Dinner satisfaction",
  BREAKFAST_SERVICE: "Breakfast service",
  DINNER_TURNOUT: "Dinner turnout",
  GENERAL_OPERATIONS: "General operations",
  MENU_ROTATION: "Menu rotation",
  MENU_REPETITION: "Menu rotation",
  MENU_REPETITION_AND_STUDENT_FATIGUE: "Menu rotation",
};

export const SHORT_TARGET_DISPLAY_MAP: Record<string, string> = {
  DINNER_SATISFACTION: "Dinner",
  BREAKFAST_SERVICE: "Breakfast",
  DINNER_TURNOUT: "Dinner",
  GENERAL_OPERATIONS: "General",
  MENU_ROTATION: "Menu rotation",
  MENU_REPETITION: "Menu rotation",
  MENU_REPETITION_AND_STUDENT_FATIGUE: "Menu rotation",
};

export const TASK_STATUS_DISPLAY_MAP: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  READY_FOR_VERIFICATION: "Ready for verification",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function humanizeStatus(status?: string | null): string {
  if (!status) return "";
  if (STATUS_DISPLAY_MAP[status]) return STATUS_DISPLAY_MAP[status];
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function humanizeTaskStatus(status?: string | null): string {
  if (!status) return "";
  if (TASK_STATUS_DISPLAY_MAP[status]) return TASK_STATUS_DISPLAY_MAP[status];
  return humanizeStatus(status);
}

export function humanizeActionType(actionType?: string | null): string {
  if (!actionType) return "Review proposal";
  if (ACTION_TYPE_DISPLAY_MAP[actionType]) return ACTION_TYPE_DISPLAY_MAP[actionType];
  return actionType
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function humanizeToolName(toolName?: string | null): string {
  if (!toolName) return "";
  if (TOOL_DISPLAY_MAP[toolName]) return TOOL_DISPLAY_MAP[toolName];
  return toolName
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function humanizeGoalType(goalType?: string | null): string {
  if (!goalType) return "Operational investigation";
  if (GOAL_TYPE_DISPLAY_MAP[goalType]) return GOAL_TYPE_DISPLAY_MAP[goalType];
  return goalType
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function humanizeTarget(target?: string | null): string {
  if (!target) return "General operations";
  if (TARGET_DISPLAY_MAP[target]) return TARGET_DISPLAY_MAP[target];
  return target
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function humanizeShortTarget(target?: string | null): string {
  if (!target) return "General";
  if (SHORT_TARGET_DISPLAY_MAP[target]) return SHORT_TARGET_DISPLAY_MAP[target];
  if (TARGET_DISPLAY_MAP[target]) return TARGET_DISPLAY_MAP[target];
  return target
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function humanizeInvestigationTitle(title?: string | null, target?: string | null): string {
  if (!title && !target) return "Operational investigation";
  if (title && /^Action Brief:\s*/i.test(title)) {
    const sub = title.replace(/^Action Brief:\s*/i, "").trim();
    if (sub === "DINNER_SATISFACTION") return "Dinner satisfaction";
    if (TARGET_DISPLAY_MAP[sub]) return TARGET_DISPLAY_MAP[sub];
    return humanizeTarget(sub);
  }
  if (title === "DINNER_SATISFACTION") return "Dinner satisfaction";
  if (title && TARGET_DISPLAY_MAP[title]) return TARGET_DISPLAY_MAP[title];
  if (title) {
    return title.replace(/_/g, " ").replace(/^Action Brief:\s*/i, "");
  }
  return humanizeTarget(target);
}

export function humanizeInvestigationSummary(summary?: string | null): string {
  if (!summary) {
    return "The investigation is complete. The findings below are based on recent ratings, complaints, and related analysis.";
  }
  if (
    summary.includes("INVESTIGATE_OPERATIONAL_ISSUE") ||
    summary.startsWith("Structured investigation completed")
  ) {
    return "The investigation is complete. The findings below are based on recent ratings, complaints, and related analysis.";
  }
  return summary
    .replace(/INVESTIGATE_OPERATIONAL_ISSUE/g, "operational food service issue")
    .replace(/DINNER_SATISFACTION/g, "dinner satisfaction")
    .replace(/BREAKFAST_SERVICE/g, "breakfast service")
    .replace(/DINNER_TURNOUT/g, "dinner turnout");
}

export function humanizeContributingFactor(factor: string): string {
  if (!factor) return "";
  let text = factor;
  if (/Operational signals observed from get_complaints/i.test(text)) {
    return "Recent complaint patterns were identified for further review.";
  }
  if (/Operational signals observed from get_recent_ratings/i.test(text)) {
    return "Recent food rating trends were identified for further review.";
  }
  if (/Operational signals observed from run_root_cause/i.test(text)) {
    return "Root cause analysis indicates meal consistency factors worth reviewing.";
  }
  if (/Operational signals observed from run_forecast/i.test(text) || /Operational signals observed from run_prediction/i.test(text)) {
    return "Rating forecast indicates potential variation in student ratings.";
  }
  if (/Operational signals observed from run_simulation/i.test(text)) {
    return "Menu scenario comparison indicates potential satisfaction improvement.";
  }
  return text
    .replace(/\bget_complaints\b/g, "recent complaints")
    .replace(/\bget_recent_ratings\b/g, "recent food ratings")
    .replace(/\bget_poll_results\b/g, "student poll results")
    .replace(/\bget_menu_history\b/g, "menu history")
    .replace(/\brun_root_cause\b/g, "root cause analysis")
    .replace(/\brun_forecast\b/g, "rating forecast")
    .replace(/\brun_prediction\b/g, "rating forecast")
    .replace(/\brun_simulation\b/g, "menu scenario comparison");
}

export function humanizeEvidence(evidence: string): string {
  if (!evidence) return "";
  let text = evidence;

  text = text.replace(
    /Retrieved\s+(\d+)\s+complaint\s+record\(s\)\.?\s*Pending:\s*(\d+),\s*Resolved:\s*(\d+)\.?/gi,
    (_match, total, pending, resolved) =>
      `${total} complaints were reviewed — ${pending} are still pending and ${resolved} have been resolved.`
  );

  text = text.replace(
    /Retrieved\s+rating\s+analytics\s+for\s+(\d+)\s+food\s+item\(s\)\.?/gi,
    (_match, count) => `Ratings were reviewed across ${count} food items.`
  );

  text = text.replace(
    /Retrieved\s+(\d+)\s+poll\s+record\(s\)\.?/gi,
    (_match, count) => `Reviewed ${count} student poll results.`
  );

  text = text.replace(
    /Retrieved\s+(\d+)\s+menu\s+schedule\s+record\(s\)\.?/gi,
    (_match, count) => `Reviewed ${count} menu schedule entries.`
  );

  text = text.replace(/record\(s\)/gi, "records");
  text = text.replace(/food item\(s\)/gi, "food items");
  text = text.replace(/item\(s\)/gi, "items");
  text = text.replace(/entry\(s\)/gi, "entries");

  return text
    .replace(/\bget_complaints\b/g, "complaints review")
    .replace(/\bget_recent_ratings\b/g, "ratings review")
    .replace(/\bget_poll_results\b/g, "poll results review")
    .replace(/\bget_menu_history\b/g, "menu history review")
    .replace(/\brun_root_cause\b/g, "root cause analysis")
    .replace(/\brun_forecast\b/g, "turnout forecast")
    .replace(/\brun_prediction\b/g, "rating forecast")
    .replace(/\brun_simulation\b/g, "scenario comparison");
}

export function humanizeObservation(obs: string): string {
  if (!obs) return "";
  return obs
    .replace(/\bget_complaints\b/g, "recent complaints")
    .replace(/\bget_recent_ratings\b/g, "recent food ratings")
    .replace(/\bDINNER_SATISFACTION\b/g, "dinner satisfaction")
    .replace(/\bBREAKFAST_SERVICE\b/g, "breakfast service")
    .replace(/\bDINNER_TURNOUT\b/g, "dinner turnout")
    .replace(/record\(s\)/g, "records")
    .replace(/item\(s\)/g, "items");
}
