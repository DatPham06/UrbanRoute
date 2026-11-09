package com.urbanroute.application.route;

import java.util.List;

public record RouteResult(
        String status,
        double distanceMeters,
        String startPointName,
        String endPointName,
        Location start,
        Location end,
        List<Long> pathNodes,
        List<Coordinate> coordinates,
        String message,
        boolean isMockData) {

    public record Location(double latitude, double longitude) {
    }

    public record Coordinate(double latitude, double longitude, Long nodeId, String nodeName) {
    }
}
