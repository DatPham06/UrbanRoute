package com.urbanroute.domain.routing;

import com.urbanroute.domain.model.RoadEdge;
import com.urbanroute.domain.model.RoadNode;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.PriorityQueue;

/** Thuật toán thuần Java; mỗi cạnh chỉ đi theo chiều source → target. */
public final class DijkstraRouter {
    public record PathResult(List<Long> pathNodeIds, double distanceMeters, List<RoadNode> nodes) {
    }

    private record QueueEntry(long nodeId, double distanceMeters) {
    }

    public Optional<PathResult> shortestPath(List<RoadNode> nodes, List<RoadEdge> edges,
                                             long startNodeId, long endNodeId) {
        Map<Long, RoadNode> nodesById = new HashMap<>();
        for (RoadNode node : nodes) {
            nodesById.put(node.nodeId(), node);
        }
        if (!nodesById.containsKey(startNodeId) || !nodesById.containsKey(endNodeId)) {
            return Optional.empty();
        }

        Map<Long, List<RoadEdge>> outgoing = new HashMap<>();
        for (RoadEdge edge : edges) {
            if (!Double.isFinite(edge.lengthM()) || edge.lengthM() < 0) {
                throw new IllegalArgumentException("Dijkstra yêu cầu độ dài cạnh hữu hạn và không âm.");
            }
            if (nodesById.containsKey(edge.sourceNodeId()) && nodesById.containsKey(edge.targetNodeId())) {
                outgoing.computeIfAbsent(edge.sourceNodeId(), ignored -> new ArrayList<>()).add(edge);
            }
        }

        Map<Long, Double> distances = new HashMap<>();
        Map<Long, Long> previous = new HashMap<>();
        PriorityQueue<QueueEntry> pending = new PriorityQueue<>(
                Comparator.comparingDouble(QueueEntry::distanceMeters).thenComparingLong(QueueEntry::nodeId));
        distances.put(startNodeId, 0.0);
        pending.add(new QueueEntry(startNodeId, 0));

        while (!pending.isEmpty()) {
            QueueEntry current = pending.remove();
            if (current.distanceMeters() > distances.getOrDefault(current.nodeId(), Double.POSITIVE_INFINITY)) {
                continue;
            }
            if (current.nodeId() == endNodeId) {
                List<Long> pathIds = new ArrayList<>();
                Long cursor = endNodeId;
                while (cursor != null) {
                    pathIds.add(cursor);
                    cursor = previous.get(cursor);
                }
                Collections.reverse(pathIds);
                return Optional.of(new PathResult(List.copyOf(pathIds), current.distanceMeters(),
                        pathIds.stream().map(nodesById::get).toList()));
            }

            for (RoadEdge edge : outgoing.getOrDefault(current.nodeId(), List.of())) {
                double candidate = current.distanceMeters() + edge.lengthM();
                if (candidate < distances.getOrDefault(edge.targetNodeId(), Double.POSITIVE_INFINITY)) {
                    distances.put(edge.targetNodeId(), candidate);
                    previous.put(edge.targetNodeId(), current.nodeId());
                    pending.add(new QueueEntry(edge.targetNodeId(), candidate));
                }
            }
        }
        return Optional.empty();
    }

    public static Optional<RoadNode> nearestNode(List<RoadNode> nodes, double latitude,
                                                  double longitude, double maxMeters) {
        if (!Double.isFinite(latitude) || Math.abs(latitude) > 90
                || !Double.isFinite(longitude) || Math.abs(longitude) > 180
                || !Double.isFinite(maxMeters) || maxMeters < 0) {
            throw new IllegalArgumentException("Tọa độ hoặc bán kính tìm nút đường không hợp lệ.");
        }
        return nodes.stream()
                .filter(node -> GeoUtils.haversineMeters(latitude, longitude,
                        node.latitude(), node.longitude()) <= maxMeters)
                .min(Comparator.comparingDouble((RoadNode node) -> GeoUtils.haversineMeters(latitude, longitude,
                        node.latitude(), node.longitude())).thenComparingLong(RoadNode::nodeId));
    }
}
