package com.messo.agent.tool.input;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Structured, validated input for an Agent tool execution.
 *
 * <p>A {@code ToolInput} carries a set of key→value parameters that the
 * tool implementation will validate before use.  No raw SQL, no reflection
 * hooks, no arbitrary executable content is accepted.</p>
 *
 * <h3>Usage</h3>
 * <pre>{@code
 * ToolInput input = ToolInput.of(Map.of(
 *     "startDate", "2026-09-01",
 *     "endDate",   "2026-09-30",
 *     "limit",     "50"
 * ));
 * }</pre>
 *
 * <p>Tool implementations pull typed values using the provided helper
 * methods, which centralise null/missing-key handling.</p>
 */
public final class ToolInput {

    /**
     * Upper bound on the number of parameters to prevent abuse.
     */
    private static final int MAX_PARAMS = 30;

    /**
     * Upper bound on parameter value length to prevent injection attempts.
     */
    private static final int MAX_VALUE_LENGTH = 500;

    private final Map<String, String> params;

    private ToolInput(Map<String, String> params) {
        this.params = Collections.unmodifiableMap(params);
    }

    // =========================================================================
    // Factory methods
    // =========================================================================

    /**
     * Creates an empty {@code ToolInput} (for tools that require no parameters).
     */
    public static ToolInput empty() {
        return new ToolInput(Collections.emptyMap());
    }

    /**
     * Creates a {@code ToolInput} from the given parameter map.
     *
     * @throws IllegalArgumentException if the map exceeds safety limits
     */
    public static ToolInput of(Map<String, String> params) {
        if (params == null) {
            return empty();
        }
        if (params.size() > MAX_PARAMS) {
            throw new IllegalArgumentException(
                    "ToolInput: too many parameters (max " + MAX_PARAMS + ")");
        }
        Map<String, String> safe = new HashMap<>();
        for (Map.Entry<String, String> e : params.entrySet()) {
            String key = e.getKey();
            String value = e.getValue();
            if (key == null || key.isBlank()) {
                throw new IllegalArgumentException("ToolInput: parameter key must not be blank");
            }
            if (value != null && value.length() > MAX_VALUE_LENGTH) {
                throw new IllegalArgumentException(
                        "ToolInput: value for '" + key + "' exceeds max length " + MAX_VALUE_LENGTH);
            }
            safe.put(key.trim(), value);
        }
        return new ToolInput(safe);
    }

    // =========================================================================
    // Parameter accessors
    // =========================================================================

    /**
     * Returns the raw string value for {@code key}, or {@code null} if absent.
     */
    public String get(String key) {
        return params.get(key);
    }

    /**
     * Returns the string value for {@code key}, or {@code defaultValue} if absent.
     */
    public String getOrDefault(String key, String defaultValue) {
        return params.getOrDefault(key, defaultValue);
    }

    /**
     * Returns the integer value for {@code key}, or {@code defaultValue}
     * if absent or not parseable.
     */
    public int getInt(String key, int defaultValue) {
        String v = params.get(key);
        if (v == null) return defaultValue;
        try {
            return Integer.parseInt(v.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * Returns {@code true} if the given key is present and non-blank.
     */
    public boolean has(String key) {
        String v = params.get(key);
        return v != null && !v.isBlank();
    }

    /**
     * Returns an unmodifiable view of all parameters.
     */
    public Map<String, String> asMap() {
        return params;
    }

    @Override
    public String toString() {
        return "ToolInput" + params;
    }
}
