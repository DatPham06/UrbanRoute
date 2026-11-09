package com.urbanroute.application.route;

import com.urbanroute.application.delivery.DeliveryPointService;
import com.urbanroute.application.error.ApplicationException;
import com.urbanroute.application.error.ApplicationException.Reason;
import com.urbanroute.application.port.HistoryRepository;
import com.urbanroute.application.port.RoadRepository;
import com.urbanroute.application.port.TransactionRunner;
import com.urbanroute.domain.model.DeliveryPoint;
import com.urbanroute.domain.model.RoadNode;
import com.urbanroute.domain.routing.DijkstraRouter;
import com.urbanroute.domain.routing.GeoUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public class RouteService {
    private static final double MAX_NODE_DISTANCE_METERS = 5_000;

    private final DeliveryPointService deliveryPoints;
    private final RoadRepository roads;
    private final HistoryRepository history;
    private final TransactionRunner transactions;
    private final DijkstraRouter router = new DijkstraRouter();

    public RouteService(DeliveryPointService deliveryPoints, RoadRepository roads, HistoryRepository history,
                        TransactionRunner transactions) {
        this.deliveryPoints = deliveryPoints;
        this.roads = roads;
        this.history = history;
        this.transactions = transactions;
    }

    public RouteResult computeShortestRoute(RouteSearchCommand request, long driverId) {
        validateRequest(request);
        return transactions.write(() -> searchAndRecord(request, driverId));
    }

    private RouteResult searchAndRecord(RouteSearchCommand request, long driverId) {
        DeliveryPoint destination = deliveryPoints.requireActive(request.endPointId());
        List<RoadNode> nodes = roads.findNodes();

        Long startPointId = null;
        Long startNodeId;
        String startName;
        RouteResult.Location start;

        if ("CURRENT_TO_POINT".equals(request.searchType())) {
            start = new RouteResult.Location(request.startLatitude(), request.startLongitude());
            startName = String.format(Locale.ROOT, "Vị trí hiện tại (%.4f, %.4f)",
                    start.latitude(), start.longitude());
            startNodeId = DijkstraRouter.nearestNode(nodes, start.latitude(), start.longitude(),
                    MAX_NODE_DISTANCE_METERS).map(RoadNode::nodeId).orElse(null);
        } else {
            DeliveryPoint origin = deliveryPoints.requireActive(request.startPointId());
            startPointId = origin.pointId();
            startNodeId = origin.nodeId();
            startName = origin.pointName();
            start = new RouteResult.Location(origin.latitude(), origin.longitude());
        }

        RouteResult.Location end = new RouteResult.Location(destination.latitude(), destination.longitude());
        Optional<DijkstraRouter.PathResult> path = Optional.empty();
        if (startNodeId != null && destination.nodeId() != null) {
            path = router.shortestPath(nodes, roads.findEdges(), startNodeId, destination.nodeId());
        }

        if (path.isEmpty()) {
            history.record(driverId, request.searchType(), startPointId, startName, destination.pointId(),
                    destination.pointName(), startNodeId, null, "NO_PATH");
            return new RouteResult("NO_PATH", 0, startName, destination.pointName(), start, end,
                    List.of(), List.of(), "Không tìm thấy tuyến đường trong mạng đường đã lưu. "
                    + "Điểm xuất phát và điểm đến cần được nối với nút đường trong phạm vi 5 km.", false);
        }

        DijkstraRouter.PathResult result = path.get();
        RoadNode first = result.nodes().getFirst();
        RoadNode last = result.nodes().getLast();
        // Những đoạn ngoài graph chỉ là đường nối ước lượng; không phải tuyến đường giao thông đã xác minh.
        double connectors = GeoUtils.haversineMeters(start.latitude(), start.longitude(),
                first.latitude(), first.longitude())
                + GeoUtils.haversineMeters(last.latitude(), last.longitude(), end.latitude(), end.longitude());
        double totalDistance = Math.round((result.distanceMeters() + connectors) * 100) / 100.0;

        List<RouteResult.Coordinate> coordinates = new ArrayList<>();
        addCoordinate(coordinates, new RouteResult.Coordinate(start.latitude(), start.longitude(), null, startName));
        for (RoadNode node : result.nodes()) {
            addCoordinate(coordinates, new RouteResult.Coordinate(node.latitude(), node.longitude(),
                    node.nodeId(), node.nodeName()));
        }
        addCoordinate(coordinates, new RouteResult.Coordinate(end.latitude(), end.longitude(), null,
                destination.pointName()));

        history.record(driverId, request.searchType(), startPointId, startName, destination.pointId(),
                destination.pointName(), startNodeId, totalDistance, "COMPLETED");
        String message = "Đã tìm được tuyến ngắn nhất trên mạng đường đã lưu.";
        if (connectors > 0.01) {
            message += " Tổng khoảng cách gồm các đoạn nối đường chim bay từ địa điểm tới nút đường; "
                    + "các đoạn nối này là ước lượng.";
        }
        return new RouteResult("COMPLETED", totalDistance, startName, destination.pointName(), start, end,
                result.pathNodeIds(), List.copyOf(coordinates), message, false);
    }

    private static void addCoordinate(List<RouteResult.Coordinate> coordinates,
                                      RouteResult.Coordinate coordinate) {
        if (!coordinates.isEmpty()) {
            RouteResult.Coordinate previous = coordinates.getLast();
            if (previous.latitude() == coordinate.latitude() && previous.longitude() == coordinate.longitude()) {
                // Giữ thông tin node nếu địa điểm nằm trùng ngay trên node.
                if (previous.nodeId() == null && coordinate.nodeId() != null) {
                    coordinates.set(coordinates.size() - 1, coordinate);
                }
                return;
            }
        }
        coordinates.add(coordinate);
    }

    private static void validateRequest(RouteSearchCommand request) {
        if (request == null || !("CURRENT_TO_POINT".equals(request.searchType())
                || "POINT_TO_POINT".equals(request.searchType()))) {
            throw badRequest("Loại tìm đường không hợp lệ.");
        }
        if (request.endPointId() == null || request.endPointId() <= 0) {
            throw badRequest("Vui lòng chọn điểm đến hợp lệ.");
        }
        if ("CURRENT_TO_POINT".equals(request.searchType())) {
            if (request.startLatitude() == null || request.startLongitude() == null) {
                throw badRequest("Thiếu tọa độ vị trí hiện tại.");
            }
            if (!Double.isFinite(request.startLatitude()) || Math.abs(request.startLatitude()) > 90
                    || !Double.isFinite(request.startLongitude()) || Math.abs(request.startLongitude()) > 180) {
                throw badRequest("Tọa độ không hợp lệ: vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180.");
            }
        } else {
            if (request.startPointId() == null || request.startPointId() <= 0) {
                throw badRequest("Vui lòng chọn điểm xuất phát hợp lệ.");
            }
            if (request.startPointId().equals(request.endPointId())) {
                throw badRequest("Điểm xuất phát và điểm đến phải khác nhau.");
            }
        }
    }

    private static ApplicationException badRequest(String message) {
        return new ApplicationException(Reason.INVALID_INPUT, message);
    }
}
