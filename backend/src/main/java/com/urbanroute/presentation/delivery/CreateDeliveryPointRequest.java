package com.urbanroute.presentation.delivery;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateDeliveryPointRequest(
        @NotBlank(message = "Vui lòng nhập tên địa điểm") @Size(max = 200) String pointName,
        @NotBlank(message = "Vui lòng nhập địa chỉ") @Size(max = 500) String address,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotNull Boolean isActive) {
}
