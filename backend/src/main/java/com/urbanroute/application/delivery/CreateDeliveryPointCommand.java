package com.urbanroute.application.delivery;

public record CreateDeliveryPointCommand(String pointName, String address, double latitude,
                                         double longitude, boolean isActive) {
}
