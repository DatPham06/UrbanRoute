package com.urbanroute.application.port;

import com.urbanroute.domain.model.DeliveryPoint;
import java.util.List;
import java.util.Optional;

public interface DeliveryPointRepository {
    List<DeliveryPoint> findAll(boolean activeOnly);

    Optional<DeliveryPoint> findById(long id);

    DeliveryPoint create(String name, String address, double latitude, double longitude,
                         Long nodeId, String createdBy, boolean isActive);

    DeliveryPoint update(DeliveryPoint point);

    void softDelete(long id);
}
