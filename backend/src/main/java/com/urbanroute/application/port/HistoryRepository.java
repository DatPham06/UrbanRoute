package com.urbanroute.application.port;

import com.urbanroute.domain.model.HistoryRecord;
import java.util.List;

public interface HistoryRepository {
    void record(long driverId, String searchType, Long startPointId, String startPointName,
                long endPointId, String endPointName, Long startNodeId, Double distanceM, String status);

    List<HistoryRecord> findAll();

    List<HistoryRecord> findByDriver(long driverId);
}
