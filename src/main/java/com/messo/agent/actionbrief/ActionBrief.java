package com.messo.agent.actionbrief;

import java.util.Collections;
import java.util.List;

/**
 * Structured proposal for human administrator review generated from an investigation.
 *
 * <p>Enforces strict semantic boundaries:
 * <ul>
 *   <li><b>OBSERVATION</b>: What the system directly observed from data.</li>
 *   <li><b>EVIDENCE</b>: Supporting data points (ratings, trends, poll results).</li>
 *   <li><b>POSSIBLE FACTOR</b>: Potential contributing factors without claiming absolute causation.</li>
 *   <li><b>MODEL OUTPUT</b>: Outputs from existing AI engines (WHY, WHAT NEXT, WHAT IF).</li>
 *   <li><b>PROPOSED ACTION</b>: The specific operational step recommended for human review.</li>
 *   <li><b>RATIONALE</b>: Logical link connecting evidence to the proposed action.</li>
 *   <li><b>ASSUMPTIONS & LIMITATIONS</b>: Clear boundaries and analytical caveats.</li>
 *   <li><b>SOURCE STEPS</b>: Traceability referencing specific executed step sequences.</li>
 * </ul>
 */
public record ActionBrief(
        String title,
        String summary,
        List<String> observations,
        List<String> evidence,
        List<String> possibleFactors,
        List<String> modelOutputs,
        ProposedActionDetails proposedAction,
        String rationale,
        List<String> assumptions,
        List<String> limitations,
        List<Integer> sourceSteps,
        String generatedAt,
        String status
) {
    public record ProposedActionDetails(
            ProposedActionType type,
            String description,
            String suggestedTarget,
            String actionType,
            String targetDate,
            String mealType,
            String currentFood,
            String proposedFood
    ) {
        public ProposedActionDetails(ProposedActionType type, String description, String suggestedTarget) {
            this(type, description, suggestedTarget, type != null ? type.name() : null, null, null, null, null);
        }
    }

    public ActionBrief {
        observations = observations != null ? List.copyOf(observations) : Collections.emptyList();
        evidence = evidence != null ? List.copyOf(evidence) : Collections.emptyList();
        possibleFactors = possibleFactors != null ? List.copyOf(possibleFactors) : Collections.emptyList();
        modelOutputs = modelOutputs != null ? List.copyOf(modelOutputs) : Collections.emptyList();
        assumptions = assumptions != null ? List.copyOf(assumptions) : Collections.emptyList();
        limitations = limitations != null ? List.copyOf(limitations) : Collections.emptyList();
        sourceSteps = sourceSteps != null ? List.copyOf(sourceSteps) : Collections.emptyList();
    }
}
