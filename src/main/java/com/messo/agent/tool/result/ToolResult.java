package com.messo.agent.tool.result;

import com.messo.agent.AgentToolType;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;

/**
 * Structured result of a single tool execution.
 *
 * <p>Every field has a defined meaning regardless of success or failure:
 * <ul>
 *   <li>{@link #isSuccess()} — overall outcome</li>
 *   <li>{@link #getToolName()} — which tool produced this result</li>
 *   <li>{@link #getToolType()} — READ_ONLY or ACTION (audit reference)</li>
 *   <li>{@link #getSummary()} — one-sentence human-readable outcome</li>
 *   <li>{@link #getData()} — structured data payload (empty on failure)</li>
 *   <li>{@link #getMetadata()} — execution metadata (duration, etc.)</li>
 *   <li>{@link #getErrorCode()} — controlled error code (null on success)</li>
 *   <li>{@link #getErrorMessage()} — safe, non-sensitive error detail</li>
 *   <li>{@link #getExecutedAt()} — wall-clock timestamp of execution</li>
 * </ul>
 *
 * <p><strong>Security invariant:</strong> The error message must never contain
 * stack traces, credentials, internal paths, or environment variables.</p>
 *
 * <p>Use the static factory methods to create instances.</p>
 */
public final class ToolResult {

    private final boolean success;
    private final String toolName;
    private final AgentToolType toolType;
    private final String summary;
    private final Map<String, Object> data;
    private final Map<String, Object> metadata;
    private final String errorCode;
    private final String errorMessage;
    private final LocalDateTime executedAt;
    private final long durationMs;

    private ToolResult(Builder b) {
        this.success      = b.success;
        this.toolName     = b.toolName;
        this.toolType     = b.toolType;
        this.summary      = b.summary;
        this.data         = b.data != null ? Collections.unmodifiableMap(b.data) : Collections.emptyMap();
        this.metadata     = b.metadata != null ? Collections.unmodifiableMap(b.metadata) : Collections.emptyMap();
        this.errorCode    = b.errorCode;
        this.errorMessage = b.errorMessage;
        this.executedAt   = b.executedAt != null ? b.executedAt : LocalDateTime.now();
        this.durationMs   = b.durationMs;
    }

    // =========================================================================
    // Factory helpers
    // =========================================================================

    public static Builder success(String toolName, AgentToolType toolType) {
        return new Builder(true, toolName, toolType);
    }

    public static ToolResult failure(String toolName, AgentToolType toolType,
                                     String errorCode, String errorMessage) {
        return new Builder(false, toolName, toolType)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .summary("Tool execution failed: " + errorCode)
                .build();
    }

    // =========================================================================
    // Accessors
    // =========================================================================

    public boolean isSuccess()                  { return success; }
    public String getToolName()                 { return toolName; }
    public AgentToolType getToolType()          { return toolType; }
    public String getSummary()                  { return summary; }
    public Map<String, Object> getData()        { return data; }
    public Map<String, Object> getMetadata()    { return metadata; }
    public String getErrorCode()                { return errorCode; }
    public String getErrorMessage()             { return errorMessage; }
    public LocalDateTime getExecutedAt()        { return executedAt; }
    public long getDurationMs()                 { return durationMs; }

    // =========================================================================
    // Builder
    // =========================================================================

    public static final class Builder {

        private final boolean success;
        private final String toolName;
        private final AgentToolType toolType;
        private String summary;
        private Map<String, Object> data;
        private Map<String, Object> metadata;
        private String errorCode;
        private String errorMessage;
        private LocalDateTime executedAt;
        private long durationMs;

        private Builder(boolean success, String toolName, AgentToolType toolType) {
            this.success  = success;
            this.toolName = toolName;
            this.toolType = toolType;
        }

        public Builder summary(String summary)                   { this.summary = summary; return this; }
        public Builder data(Map<String, Object> data)            { this.data = data; return this; }
        public Builder metadata(Map<String, Object> metadata)    { this.metadata = metadata; return this; }
        public Builder errorCode(String errorCode)               { this.errorCode = errorCode; return this; }
        public Builder errorMessage(String errorMessage)         { this.errorMessage = errorMessage; return this; }
        public Builder executedAt(LocalDateTime executedAt)      { this.executedAt = executedAt; return this; }
        public Builder durationMs(long durationMs)               { this.durationMs = durationMs; return this; }

        public ToolResult build() {
            return new ToolResult(this);
        }
    }
}
