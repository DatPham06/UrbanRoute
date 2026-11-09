package com.urbanroute.presentation.delivery;

import com.urbanroute.application.delivery.CreateDeliveryPointCommand;
import com.urbanroute.application.delivery.DeliveryPointService;
import com.urbanroute.application.delivery.UpdateDeliveryPointCommand;
import com.urbanroute.domain.model.DeliveryPoint;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DeliveryPointController {
    private final DeliveryPointService service;

    public DeliveryPointController(DeliveryPointService service) {
        this.service = service;
    }

    @GetMapping("/api/delivery-points")
    public List<DeliveryPoint> activePoints() {
        return service.findAll(true);
    }

    @GetMapping("/api/admin/delivery-points")
    public List<DeliveryPoint> allPoints() {
        return service.findAll(false);
    }

    @PostMapping("/api/admin/delivery-points")
    @ResponseStatus(HttpStatus.CREATED)
    public DeliveryPoint create(@Valid @RequestBody CreateDeliveryPointRequest request,
                                Authentication authentication) {
        var command = new CreateDeliveryPointCommand(request.pointName(), request.address(),
                request.latitude(), request.longitude(), request.isActive());
        return service.create(command, authentication.getName());
    }

    @PutMapping("/api/admin/delivery-points/{id}")
    public DeliveryPoint update(@PathVariable long id,
                                @Valid @RequestBody UpdateDeliveryPointRequest request) {
        var command = new UpdateDeliveryPointCommand(request.pointName(), request.address(),
                request.latitude(), request.longitude(), request.isActive());
        return service.update(id, command);
    }

    @PatchMapping("/api/admin/delivery-points/{id}/status")
    public DeliveryPoint setStatus(@PathVariable long id,
                                   @Valid @RequestBody StatusRequest request) {
        return service.setStatus(id, request.isActive());
    }

    @DeleteMapping("/api/admin/delivery-points/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    public record StatusRequest(@NotNull Boolean isActive) {
    }
}
