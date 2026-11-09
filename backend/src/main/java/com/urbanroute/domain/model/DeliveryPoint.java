package com.urbanroute.domain.model;

import java.time.LocalDateTime;

public record DeliveryPoint(Long pointId, String pointName, String address, double latitude,
                            double longitude, Long nodeId, String createdBy, boolean isActive,
                            LocalDateTime createdAt, LocalDateTime updatedAt) {
}
