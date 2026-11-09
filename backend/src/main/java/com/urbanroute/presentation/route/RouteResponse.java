package com.urbanroute.presentation.route;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.urbanroute.application.route.RouteResult;

import java.util.List;

public record RouteResponse(
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

    static RouteResponse from(RouteResult result) {
        return new RouteResponse(result.status(), result.distanceMeters(), result.startPointName(),
                result.endPointName(), new Location(result.start().latitude(), result.start().longitude()),
                new Location(result.end().latitude(), result.end().longitude()), result.pathNodes(),
                result.coordinates().stream()
                        .map(point -> new Coordinate(point.latitude(), point.longitude(), point.nodeId(), point.nodeName()))
                        .toList(),
                result.message(), result.isMockData());
    }

    public record Location(double latitude, double longitude) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Coordinate(double latitude, double longitude, Long nodeId, String nodeName) {
    }
}
