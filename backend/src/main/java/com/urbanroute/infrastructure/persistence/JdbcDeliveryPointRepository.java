package com.urbanroute.infrastructure.persistence;

import com.urbanroute.application.port.DeliveryPointRepository;
import com.urbanroute.domain.model.DeliveryPoint;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcDeliveryPointRepository implements DeliveryPointRepository {
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final RowMapper<DeliveryPoint> ROW_MAPPER = JdbcDeliveryPointRepository::mapRow;
    private final JdbcTemplate jdbc;

    public JdbcDeliveryPointRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<DeliveryPoint> findAll(boolean activeOnly) {
        String sql = "SELECT * FROM delivery_points WHERE is_deleted = 0"
                + (activeOnly ? " AND is_active = 1" : "")
                + " ORDER BY created_at DESC, point_id DESC";
        return jdbc.query(sql, ROW_MAPPER);
    }

    @Override
    public Optional<DeliveryPoint> findById(long id) {
        return jdbc.query("SELECT * FROM delivery_points WHERE point_id = ? AND is_deleted = 0",
                ROW_MAPPER, id).stream().findFirst();
    }

    @Override
    public DeliveryPoint create(String name, String address, double latitude, double longitude,
                                Long nodeId, String createdBy, boolean isActive) {
        Long id = jdbc.queryForObject("SELECT delivery_points_seq.NEXTVAL FROM dual", Long.class);
        jdbc.update("""
                INSERT INTO delivery_points
                    (point_id, point_name, address, latitude, longitude, node_id, created_by, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, name, address, latitude, longitude, nodeId, createdBy, isActive ? 1 : 0,
                Timestamp.valueOf(LocalDateTime.now(APP_ZONE)));
        return findById(id).orElseThrow();
    }

    @Override
    public DeliveryPoint update(DeliveryPoint point) {
        jdbc.update("""
                UPDATE delivery_points SET point_name = ?, address = ?, latitude = ?, longitude = ?,
                    node_id = ?, is_active = ?, updated_at = ?
                WHERE point_id = ? AND is_deleted = 0
                """, point.pointName(), point.address(), point.latitude(), point.longitude(),
                point.nodeId(), point.isActive() ? 1 : 0,
                Timestamp.valueOf(LocalDateTime.now(APP_ZONE)), point.pointId());
        return findById(point.pointId()).orElseThrow();
    }

    @Override
    public void softDelete(long id) {
        jdbc.update("""
                UPDATE delivery_points SET is_active = 0, is_deleted = 1, updated_at = ?
                WHERE point_id = ? AND is_deleted = 0
                """, Timestamp.valueOf(LocalDateTime.now(APP_ZONE)), id);
    }

    private static DeliveryPoint mapRow(ResultSet rs, int row) throws SQLException {
        var updatedAt = rs.getTimestamp("updated_at");
        return new DeliveryPoint(rs.getLong("point_id"), rs.getString("point_name"),
                rs.getString("address"), rs.getDouble("latitude"), rs.getDouble("longitude"),
                rs.getObject("node_id", Long.class), rs.getString("created_by"),
                rs.getInt("is_active") == 1, rs.getTimestamp("created_at").toLocalDateTime(),
                updatedAt == null ? null : updatedAt.toLocalDateTime());
    }
}
