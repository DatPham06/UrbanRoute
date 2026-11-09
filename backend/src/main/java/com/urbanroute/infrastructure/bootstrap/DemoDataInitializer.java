package com.urbanroute.infrastructure.bootstrap;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.demo-data.enabled", havingValue = "true")
public class DemoDataInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final ObjectMapper json;

    public DemoDataInitializer(JdbcTemplate jdbc, PasswordEncoder passwords, ObjectMapper json) {
        this.jdbc = jdbc;
        this.passwords = passwords;
        this.json = json;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) throws Exception {
        createAccountIfAbsent("admin", "admin123", "ADMIN", "Quản trị viên");
        createAccountIfAbsent("driver", "driver123", "USER", "Tài xế demo");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM delivery_points", Long.class) == 0) {
            try (InputStream input = new ClassPathResource("demo/delivery-points.json").getInputStream()) {
                List<SeedPoint> points = json.readValue(input, new TypeReference<>() { });
                for (SeedPoint point : points) {
                    jdbc.update("""
                            INSERT INTO delivery_points
                              (point_id, point_name, address, latitude, longitude, node_id,
                               created_by, is_active, is_deleted, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, 'admin', ?, 0, ?, ?)
                            """, point.pointId(), point.pointName(), point.address(), point.latitude(),
                            point.longitude(), point.nodeId(), point.isActive() ? 1 : 0,
                            Timestamp.valueOf(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))),
                            Timestamp.valueOf(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))));
                }
            }
        }
        log.warn("Demo data enabled: admin/admin123 and driver/driver123 are local learning accounts.");
    }

    private void createAccountIfAbsent(String username, String password, String role, String fullName) {
        if (jdbc.queryForObject("SELECT COUNT(*) FROM accounts WHERE username = ?", Long.class, username) == 0) {
            jdbc.update("""
                    INSERT INTO accounts (account_id, username, password_hash, role, is_active, full_name)
                    VALUES (accounts_seq.NEXTVAL, ?, ?, ?, 1, ?)
                    """, username, passwords.encode(password), role, fullName);
        }
    }

    public record SeedPoint(long pointId, String pointName, String address, double latitude,
                            double longitude, long nodeId, boolean isActive) { }
}
