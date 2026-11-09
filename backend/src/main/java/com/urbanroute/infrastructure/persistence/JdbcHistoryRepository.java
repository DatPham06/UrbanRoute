package com.urbanroute.infrastructure.persistence;

import com.urbanroute.application.port.HistoryRepository;
import com.urbanroute.domain.model.HistoryRecord;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcHistoryRepository implements HistoryRepository {
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String SELECT_WITH_DRIVER = """
            SELECT h.*, a.username AS driver_username
            FROM history h JOIN accounts a ON a.account_id = h.driver_id
            """;
    private static final RowMapper<HistoryRecord> ROW_MAPPER = JdbcHistoryRepository::mapRow;
    private final JdbcTemplate jdbc;

    public JdbcHistoryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void record(long driverId, String searchType, Long startPointId, String startPointName,
                       long endPointId, String endPointName, Long startNodeId,
                       Double distanceM, String status) {
        jdbc.update("""
                INSERT INTO history (history_id, driver_id, search_type, start_point_id,
                    start_point_name, end_point_id, end_point_name, start_node_id, distance_m, status, searched_at)
                VALUES (history_seq.NEXTVAL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, driverId, searchType, startPointId, startPointName, endPointId,
                endPointName, startNodeId, distanceM, status, Timestamp.valueOf(LocalDateTime.now(APP_ZONE)));
    }

    @Override
    public List<HistoryRecord> findAll() {
        return jdbc.query(SELECT_WITH_DRIVER + " ORDER BY h.searched_at DESC, h.history_id DESC", ROW_MAPPER);
    }

    @Override
    public List<HistoryRecord> findByDriver(long driverId) {
        return jdbc.query(SELECT_WITH_DRIVER
                + " WHERE h.driver_id = ? ORDER BY h.searched_at DESC, h.history_id DESC", ROW_MAPPER, driverId);
    }

    private static HistoryRecord mapRow(ResultSet rs, int row) throws SQLException {
        return new HistoryRecord(rs.getLong("history_id"), rs.getLong("driver_id"),
                rs.getString("driver_username"), rs.getString("search_type"),
                rs.getObject("start_point_id", Long.class), rs.getString("start_point_name"),
                rs.getLong("end_point_id"), rs.getString("end_point_name"),
                rs.getObject("start_node_id", Long.class), rs.getObject("distance_m", Double.class),
                rs.getString("status"), rs.getTimestamp("searched_at").toLocalDateTime());
    }
}
