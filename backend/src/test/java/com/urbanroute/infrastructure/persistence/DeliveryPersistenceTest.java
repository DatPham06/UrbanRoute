package com.urbanroute.infrastructure.persistence;

import com.urbanroute.application.delivery.CreateDeliveryPointCommand;
import com.urbanroute.application.delivery.DeliveryPointService;
import com.urbanroute.application.delivery.UpdateDeliveryPointCommand;
import com.urbanroute.application.port.DeliveryPointRepository;
import com.urbanroute.domain.model.DeliveryPoint;
import com.urbanroute.application.error.ApplicationException;
import com.urbanroute.application.dashboard.DashboardService;
import com.urbanroute.application.port.HistoryRepository;
import com.urbanroute.infrastructure.transaction.SpringTransactionRunner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:delivery-test;MODE=Oracle;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JdbcDeliveryPointRepository.class, JdbcRoadRepository.class, JdbcHistoryRepository.class,
        SpringTransactionRunner.class, DeliveryPointService.class, DashboardService.class})
class DeliveryPersistenceTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DeliveryPointService service;
    @Autowired private DeliveryPointRepository points;
    @Autowired private HistoryRepository history;
    @Autowired private DashboardService dashboard;

    @BeforeEach
    void createAccounts() {
        jdbc.update("""
                INSERT INTO accounts (account_id, username, password_hash, role, is_active)
                VALUES (1001, 'test-admin', 'not-used-in-repository-test', 'ADMIN', 1)
                """);
        jdbc.update("""
                INSERT INTO accounts (account_id, username, password_hash, role, is_active)
                VALUES (1002, 'test-driver', 'not-used-in-repository-test', 'USER', 1)
                """);
    }

    @Test
    void softDeletionHidesPointButPreservesHistoryAndForeignKeys() {
        DeliveryPoint point = createPoint();
        history.record(1002, "CURRENT_TO_POINT", null, "Vị trí hiện tại", point.pointId(),
                point.pointName(), 104L, 850.0, "COMPLETED");

        service.delete(point.pointId());

        assertThat(points.findAll(false)).isEmpty();
        assertThat(points.findById(point.pointId())).isEmpty();
        assertThat(history.findByDriver(1002)).singleElement().satisfies(record -> {
            assertThat(record.endPointId()).isEqualTo(point.pointId());
            assertThat(record.endPointName()).isEqualTo(point.pointName());
            assertThat(record.driverUsername()).isEqualTo("test-driver");
        });
        assertThat(history.findByDriver(1001)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT is_deleted FROM delivery_points WHERE point_id = ?",
                Integer.class, point.pointId())).isEqualTo(1);
        assertThat(dashboard.stats().totalDeliveryPoints()).isZero();
        assertThat(dashboard.stats().successfulSearches()).isEqualTo(1);
        assertThat(dashboard.topDestinations(5)).singleElement()
                .extracting(DashboardService.TopDestination::pointName).isEqualTo(point.pointName());
    }

    @Test
    void coordinateChangesRemapNearestNodeAndClearItOutsideGraphCoverage() {
        DeliveryPoint point = createPoint();
        assertThat(point.nodeId()).isEqualTo(104L);

        DeliveryPoint moved = service.update(point.pointId(),
                new UpdateDeliveryPointCommand(null, null, 10.7725, 106.6980, null));
        assertThat(moved.nodeId()).isEqualTo(103L);
        assertThat(moved.pointName()).isEqualTo(point.pointName());

        DeliveryPoint outside = service.update(point.pointId(),
                new UpdateDeliveryPointCommand(null, null, 0.0, 0.0, null));
        assertThat(outside.nodeId()).isNull();
    }

    @Test
    void inactivePointIsHiddenFromDriverAndCannotBeUsedByRouting() {
        DeliveryPoint point = createPoint();
        service.setStatus(point.pointId(), false);

        assertThat(points.findAll(true)).isEmpty();
        assertThat(points.findAll(false)).hasSize(1);
        assertThatThrownBy(() -> service.requireActive(point.pointId()))
                .isInstanceOf(ApplicationException.class).hasMessageContaining("vô hiệu hóa");
    }

    @Test
    void databaseRejectsInvalidRoadLengthEvenOutsideHttpValidation() {
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO road_edges (edge_id, source_node_id, target_node_id, length_m, road_name)
                VALUES (9999, 101, 102, -1, 'Invalid edge')
                """)).isInstanceOf(DataIntegrityViolationException.class);
    }

    private DeliveryPoint createPoint() {
        return service.create(new CreateDeliveryPointCommand("Bưu điện", "02 Công xã Paris",
                10.7798, 106.6990, true), "test-admin");
    }
}
