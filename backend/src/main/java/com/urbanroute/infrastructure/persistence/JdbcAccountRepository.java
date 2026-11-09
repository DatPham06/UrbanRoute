package com.urbanroute.infrastructure.persistence;

import com.urbanroute.application.port.AccountRepository;
import com.urbanroute.domain.model.Account;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAccountRepository implements AccountRepository {
    private final JdbcTemplate jdbc;

    public JdbcAccountRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Account> findByUsername(String username) {
        return jdbc.query("""
                SELECT account_id, username, password_hash, role, is_active, full_name, phone
                FROM accounts WHERE username = ?
                """, (rs, row) -> new Account(rs.getLong("account_id"), rs.getString("username"),
                rs.getString("password_hash"), rs.getString("role"), rs.getInt("is_active") == 1,
                rs.getString("full_name"), rs.getString("phone")), username).stream().findFirst();
    }
}
