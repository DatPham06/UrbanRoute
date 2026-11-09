package com.urbanroute.presentation.delivery;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateDeliveryPointRequest(
        @Size(min = 1, max = 200) @Pattern(regexp = "(?s).*\\S.*", message = "Tên địa điểm không được để trống") String pointName,
        @Size(min = 1, max = 500) @Pattern(regexp = "(?s).*\\S.*", message = "Địa chỉ không được để trống") String address,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude,
        Boolean isActive) {
}
