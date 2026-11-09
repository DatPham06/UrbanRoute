package com.urbanroute.application.delivery;

public record UpdateDeliveryPointCommand(String pointName, String address, Double latitude,
                                         Double longitude, Boolean isActive) {
}
