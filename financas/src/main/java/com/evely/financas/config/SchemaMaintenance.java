package com.evely.financas.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaMaintenance {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ajustarColunasFinanceiras() {
        executeIgnoringFailure(
            "ALTER TABLE transactions MODIFY COLUMN destination_account_id varchar(36) NULL"
        );
        executeIgnoringFailure(
            "ALTER TABLE recurring_transactions ADD COLUMN destination_account_id varchar(36) NULL"
        );
        executeIgnoringFailure(
            "ALTER TABLE recurring_transactions MODIFY COLUMN type varchar(30) NOT NULL"
        );
        executeIgnoringFailure(
            "ALTER TABLE transactions MODIFY COLUMN type varchar(30) NULL"
        );
        executeIgnoringFailure(
            "ALTER TABLE accounts ADD COLUMN is_active boolean NOT NULL DEFAULT true"
        );
        executeIgnoringFailure(
            "ALTER TABLE categories ADD COLUMN is_active boolean NOT NULL DEFAULT true"
        );
        executeIgnoringFailure(
            "UPDATE categories SET is_active = active WHERE active IS NOT NULL"
        );
    }

    private void executeIgnoringFailure(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception ex) {
            log.debug("Schema maintenance skipped for [{}]: {}", sql, ex.getMessage());
        }
    }
}
