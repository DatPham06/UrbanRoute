package com.urbanroute.domain.model;

import java.time.LocalDateTime;

public record HistoryRecord(Long historyId, Long driverId, String driverUsername, String searchType,
                            Long startPointId, String startPointName, Long endPointId,
                            String endPointName, Long startNodeId, Double distanceM,
                            String status, LocalDateTime searchedAt) {
}
