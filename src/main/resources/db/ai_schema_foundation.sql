-- ===================================================================
-- MESO AI Result Storage Tables (Foundation)
-- Stores non-destructive AI outputs, inferences, and predictions
-- Does NOT duplicate raw operational transactional data
-- ===================================================================

CREATE TABLE IF NOT EXISTS ai_model_version (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    parameters_json JSON,
    UNIQUE KEY uk_model_version (model_name, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_investigation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    investigation_id VARCHAR(64) NOT NULL UNIQUE,
    target_metric VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    sample_count INT NOT NULL,
    observations JSON,
    model_version VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_finding (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    investigation_id BIGINT NOT NULL,
    factor_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    confidence DOUBLE NOT NULL,
    evidence_json JSON,
    CONSTRAINT fk_finding_investigation FOREIGN KEY (investigation_id) REFERENCES ai_investigation(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_forecast (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    forecast_id VARCHAR(64) NOT NULL UNIQUE,
    food_id BIGINT,
    food_name VARCHAR(255),
    horizon_days INT NOT NULL,
    forecast_data JSON NOT NULL,
    assumptions JSON,
    model_version VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_forecast_food FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_simulation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    simulation_id VARCHAR(64) NOT NULL UNIQUE,
    simulation_name VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(100) NOT NULL,
    input_schedule JSON NOT NULL,
    projected_outcomes JSON NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    key_tradeoffs JSON,
    model_version VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
