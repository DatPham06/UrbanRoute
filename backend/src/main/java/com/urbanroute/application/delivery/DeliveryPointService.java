package com.urbanroute.application.delivery;

import com.urbanroute.application.error.ApplicationException;
import com.urbanroute.application.error.ApplicationException.Reason;
import com.urbanroute.application.port.DeliveryPointRepository;
import com.urbanroute.application.port.RoadRepository;
import com.urbanroute.application.port.TransactionRunner;
import com.urbanroute.domain.model.DeliveryPoint;
import com.urbanroute.domain.routing.DijkstraRouter;
import java.util.List;

public class DeliveryPointService {
    private final DeliveryPointRepository points;
    private final RoadRepository roads;
    private final TransactionRunner transactions;

    public DeliveryPointService(DeliveryPointRepository points, RoadRepository roads, TransactionRunner transactions) {
        this.points = points;
        this.roads = roads;
        this.transactions = transactions;
    }

    public List<DeliveryPoint> findAll(boolean activeOnly) {
        return points.findAll(activeOnly);
    }

    public DeliveryPoint requireActive(long id) {
        DeliveryPoint point = requireExisting(id);
        if (!point.isActive()) {
            throw new ApplicationException(Reason.INVALID_INPUT, "Địa điểm đã bị vô hiệu hóa");
        }
        return point;
    }

    public DeliveryPoint create(CreateDeliveryPointCommand command, String createdBy) {
        return transactions.write(() -> {
            Long nodeId = nearestNodeId(command.latitude(), command.longitude());
            return points.create(command.pointName().strip(), command.address().strip(), command.latitude(),
                    command.longitude(), nodeId, createdBy, command.isActive());
        });
    }

    public DeliveryPoint update(long id, UpdateDeliveryPointCommand command) {
        return transactions.write(() -> {
            DeliveryPoint current = requireExisting(id);
            double latitude = command.latitude() == null ? current.latitude() : command.latitude();
            double longitude = command.longitude() == null ? current.longitude() : command.longitude();
            Long nodeId = command.latitude() == null && command.longitude() == null
                    ? current.nodeId() : nearestNodeId(latitude, longitude);
            return points.update(new DeliveryPoint(current.pointId(),
                    command.pointName() == null ? current.pointName() : command.pointName().strip(),
                    command.address() == null ? current.address() : command.address().strip(),
                    latitude, longitude, nodeId, current.createdBy(),
                    command.isActive() == null ? current.isActive() : command.isActive(),
                    current.createdAt(), current.updatedAt()));
        });
    }

    public DeliveryPoint setStatus(long id, boolean active) {
        return update(id, new UpdateDeliveryPointCommand(null, null, null, null, active));
    }

    public void delete(long id) {
        transactions.write(() -> {
            requireExisting(id);
            points.softDelete(id);
        });
    }

    private DeliveryPoint requireExisting(long id) {
        return points.findById(id).orElseThrow(() ->
                new ApplicationException(Reason.NOT_FOUND, "Không tìm thấy địa điểm với mã " + id));
    }

    private Long nearestNodeId(double latitude, double longitude) {
        return DijkstraRouter.nearestNode(roads.findNodes(), latitude, longitude, 5000)
                .map(node -> node.nodeId()).orElse(null);
    }
}
