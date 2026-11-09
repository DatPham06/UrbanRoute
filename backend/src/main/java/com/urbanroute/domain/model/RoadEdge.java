package com.urbanroute.domain.model;

public record RoadEdge(long edgeId, long sourceNodeId, long targetNodeId, double lengthM,
                       String roadName) {
}
