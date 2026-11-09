package com.urbanroute.domain.routing;

import com.urbanroute.domain.model.RoadEdge;
import com.urbanroute.domain.model.RoadNode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DijkstraRouterTest {
    private final DijkstraRouter router = new DijkstraRouter();
    private final List<RoadNode> nodes = List.of(
            new RoadNode(1, "A", 10, 106),
            new RoadNode(2, "B", 10.001, 106),
            new RoadNode(3, "C", 10.002, 106),
            new RoadNode(4, "D", 11, 107));

    @Test
    void choosesWeightedShortestPathInsteadOfTheDirectEdge() {
        List<RoadEdge> edges = List.of(
                edge(1, 1, 3, 1000), edge(2, 1, 2, 100), edge(3, 2, 3, 150));

        DijkstraRouter.PathResult result = router.shortestPath(nodes, edges, 1, 3).orElseThrow();

        assertThat(result.pathNodeIds()).containsExactly(1L, 2L, 3L);
        assertThat(result.distanceMeters()).isEqualTo(250);
        assertThat(result.nodes()).extracting(RoadNode::nodeName).containsExactly("A", "B", "C");
    }

    @Test
    void keepsTheShortestOfParallelRoadsRegardlessOfInsertionOrder() {
        List<RoadEdge> edges = List.of(edge(1, 1, 2, 100), edge(2, 1, 2, 700), edge(3, 2, 3, 50));

        assertThat(router.shortestPath(nodes, edges, 1, 3).orElseThrow().distanceMeters()).isEqualTo(150);
    }

    @Test
    void respectsOneWayRoads() {
        List<RoadEdge> edges = List.of(edge(1, 1, 2, 100));

        assertThat(router.shortestPath(nodes, edges, 1, 2)).isPresent();
        assertThat(router.shortestPath(nodes, edges, 2, 1)).isEmpty();
    }

    @Test
    void returnsEmptyForDisconnectedOrUnknownNodes() {
        List<RoadEdge> edges = List.of(edge(1, 1, 2, 100));

        assertThat(router.shortestPath(nodes, edges, 1, 4)).isEmpty();
        assertThat(router.shortestPath(nodes, edges, 99, 1)).isEmpty();
        assertThat(router.shortestPath(nodes, edges, 99, 99)).isEmpty();
    }

    @Test
    void sameKnownNodeHasAZeroLengthPath() {
        DijkstraRouter.PathResult result = router.shortestPath(nodes, List.of(), 2, 2).orElseThrow();

        assertThat(result.distanceMeters()).isZero();
        assertThat(result.pathNodeIds()).containsExactly(2L);
    }

    @Test
    void ignoresStalePriorityQueueEntriesWhenABetterRouteIsFound() {
        List<RoadEdge> edges = List.of(edge(1, 1, 2, 900), edge(2, 1, 3, 100),
                edge(3, 3, 2, 100), edge(4, 2, 4, 50), edge(5, 3, 4, 500));

        DijkstraRouter.PathResult result = router.shortestPath(nodes, edges, 1, 4).orElseThrow();

        assertThat(result.pathNodeIds()).containsExactly(1L, 3L, 2L, 4L);
        assertThat(result.distanceMeters()).isEqualTo(250);
    }

    @Test
    void rejectsNegativeRoadLengthsThatViolateDijkstraRequirements() {
        assertThatThrownBy(() -> router.shortestPath(nodes, List.of(edge(1, 1, 2, -10)), 1, 2))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void findsNearestNodeAndRejectsCoordinatesOutsideCoverage() {
        assertThat(DijkstraRouter.nearestNode(nodes, 10.0011, 106, 5000))
                .hasValueSatisfying(node -> assertThat(node.nodeId()).isEqualTo(2));
        assertThat(DijkstraRouter.nearestNode(nodes, 0, 0, 5000)).isEmpty();
        assertThat(DijkstraRouter.nearestNode(List.of(), 10, 106, 5000)).isEmpty();
    }

    @Test
    void calculatesHaversineInMeters() {
        assertThat(GeoUtils.haversineMeters(0, 0, 0, 1)).isBetween(111_194.0, 111_196.0);
        assertThat(GeoUtils.haversineMeters(10, 106, 10, 106)).isZero();
    }

    private static RoadEdge edge(long id, long source, long target, double length) {
        return new RoadEdge(id, source, target, length, "Đường " + id);
    }
}
