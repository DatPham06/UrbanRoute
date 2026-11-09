package com.urbanroute.application.route;

import com.urbanroute.application.error.ApplicationException;
import com.urbanroute.application.error.ApplicationException.Reason;
import com.urbanroute.domain.model.DeliveryPoint;
import com.urbanroute.application.delivery.DeliveryPointService;
import com.urbanroute.application.port.HistoryRepository;
import com.urbanroute.domain.model.RoadEdge;
import com.urbanroute.domain.model.RoadNode;
import com.urbanroute.application.port.RoadRepository;
import com.urbanroute.application.port.TransactionRunner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RouteServiceTest {
    private DeliveryPointService points;
    private RoadRepository roads;
    private HistoryRepository history;
    private RouteService service;

    @BeforeEach
    void setUp() {
        points = mock(DeliveryPointService.class);
        roads = mock(RoadRepository.class);
        history = mock(HistoryRepository.class);
        TransactionRunner transactions = new TransactionRunner() {
            @Override
            public <T> T write(Supplier<T> work) {
                return work.get();
            }

            @Override
            public <T> T readOnly(Supplier<T> work) {
                return work.get();
            }
        };
        service = new RouteService(points, roads, history, transactions);
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidRequestsBeforeReadingOrWritingData(RouteSearchCommand request) {
        assertThatThrownBy(() -> service.computeShortestRoute(request, 42))
                .isInstanceOf(ApplicationException.class);

        verifyNoInteractions(points, roads, history);
    }

    static Stream<RouteSearchCommand> invalidRequests() {
        return Stream.of(
                new RouteSearchCommand("UNKNOWN", 10.0, 106.0, null, 2L),
                new RouteSearchCommand("CURRENT_TO_POINT", 10.0, 106.0, null, null),
                new RouteSearchCommand("CURRENT_TO_POINT", 10.0, 106.0, null, 0L),
                new RouteSearchCommand("CURRENT_TO_POINT", null, 106.0, null, 2L),
                new RouteSearchCommand("CURRENT_TO_POINT", Double.NaN, 106.0, null, 2L),
                new RouteSearchCommand("CURRENT_TO_POINT", 10.0, Double.POSITIVE_INFINITY, null, 2L),
                new RouteSearchCommand("CURRENT_TO_POINT", 91.0, 106.0, null, 2L),
                new RouteSearchCommand("CURRENT_TO_POINT", 10.0, 181.0, null, 2L),
                new RouteSearchCommand("POINT_TO_POINT", null, null, null, 2L),
                new RouteSearchCommand("POINT_TO_POINT", null, null, 2L, 2L));
    }

    @Test
    void recordsNoPathForGpsOutsideTheRoadNetworkWithoutInventingANode() {
        when(points.requireActive(2)).thenReturn(point(2, "Đích", 11, 107, 2L));
        when(roads.findNodes()).thenReturn(List.of(new RoadNode(2, "Nút đích", 11, 107)));

        RouteResult result = service.computeShortestRoute(
                new RouteSearchCommand("CURRENT_TO_POINT", 0.0, 0.0, 99L, 2L), 42);

        assertThat(result.status()).isEqualTo("NO_PATH");
        assertThat(result.start().latitude()).isZero();
        assertThat(result.end().latitude()).isEqualTo(11);
        assertThat(result.pathNodes()).isEmpty();
        assertThat(result.coordinates()).isEmpty();
        assertThat(result.isMockData()).isFalse();
        verify(history).record(eq(42L), eq("CURRENT_TO_POINT"), isNull(), anyString(), eq(2L),
                eq("Đích"), isNull(), isNull(), eq("NO_PATH"));
    }

    @Test
    void recordsCompletedRouteForTheAuthenticatedDriver() {
        when(points.requireActive(1)).thenReturn(point(1, "Xuất phát", 10, 106, 101L));
        when(points.requireActive(2)).thenReturn(point(2, "Đích", 11, 107, 102L));
        when(roads.findNodes()).thenReturn(List.of(
                new RoadNode(101, "Nút A", 10, 106), new RoadNode(102, "Nút B", 11, 107)));
        when(roads.findEdges()).thenReturn(List.of(new RoadEdge(1, 101, 102, 1234, "Đường A")));

        RouteResult result = service.computeShortestRoute(
                new RouteSearchCommand("POINT_TO_POINT", null, null, 1L, 2L), 42);

        assertThat(result.status()).isEqualTo("COMPLETED");
        assertThat(result.distanceMeters()).isEqualTo(1234);
        assertThat(result.pathNodes()).containsExactly(101L, 102L);
        assertThat(result.coordinates()).hasSize(2);
        assertThat(result.coordinates().getFirst().nodeId()).isEqualTo(101);
        assertThat(result.isMockData()).isFalse();
        verify(history).record(42, "POINT_TO_POINT", 1L, "Xuất phát", 2, "Đích",
                101L, 1234.0, "COMPLETED");
    }

    @Test
    void includesEstimatedConnectorsWhenPointsAreNotExactlyOnGraphNodes() {
        when(points.requireActive(1)).thenReturn(point(1, "Xuất phát", 0, 0, 101L));
        when(points.requireActive(2)).thenReturn(point(2, "Đích", 0, 0.03, 102L));
        when(roads.findNodes()).thenReturn(List.of(
                new RoadNode(101, "Nút A", 0, 0.01), new RoadNode(102, "Nút B", 0, 0.02)));
        when(roads.findEdges()).thenReturn(List.of(new RoadEdge(1, 101, 102, 1500, "Đường A")));

        RouteResult result = service.computeShortestRoute(
                new RouteSearchCommand("POINT_TO_POINT", null, null, 1L, 2L), 42);

        assertThat(result.distanceMeters()).isBetween(3723.8, 3724.0);
        assertThat(result.coordinates()).hasSize(4);
        assertThat(result.message()).contains("ước lượng");
    }

    @Test
    void missingDestinationNodeReturnsNoPathInsteadOfFallingBackToAnArbitraryNode() {
        when(points.requireActive(1)).thenReturn(point(1, "Xuất phát", 10, 106, 101L));
        when(points.requireActive(2)).thenReturn(point(2, "Đích", 11, 107, null));
        when(roads.findNodes()).thenReturn(List.of(new RoadNode(101, "Nút A", 10, 106)));

        RouteResult result = service.computeShortestRoute(
                new RouteSearchCommand("POINT_TO_POINT", null, null, 1L, 2L), 42);

        assertThat(result.status()).isEqualTo("NO_PATH");
        verify(history).record(42, "POINT_TO_POINT", 1L, "Xuất phát", 2, "Đích",
                101L, null, "NO_PATH");
    }

    @Test
    void refusesAnInactiveOrDeletedDestinationWithoutCreatingHistory() {
        when(points.requireActive(2)).thenThrow(new ApplicationException(Reason.NOT_FOUND, "Điểm không tồn tại."));

        assertThatThrownBy(() -> service.computeShortestRoute(
                new RouteSearchCommand("CURRENT_TO_POINT", 10.0, 106.0, null, 2L), 42))
                .isInstanceOf(ApplicationException.class);

        verifyNoInteractions(roads, history);
    }

    private static DeliveryPoint point(long id, String name, double latitude, double longitude, Long nodeId) {
        LocalDateTime now = LocalDateTime.of(2026, 11, 4, 12, 0);
        return new DeliveryPoint(id, name, "Địa chỉ", latitude, longitude, nodeId, "admin", true, now, now);
    }
}
