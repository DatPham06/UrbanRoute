package com.urbanroute.application.route;

public record RouteSearchCommand(String searchType, Double startLatitude, Double startLongitude,
                                 Long startPointId, Long endPointId) {
}
