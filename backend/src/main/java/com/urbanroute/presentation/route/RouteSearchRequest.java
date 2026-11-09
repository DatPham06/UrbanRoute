package com.urbanroute.presentation.route;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public record RouteSearchRequest(
        @NotBlank(message = "Vui lòng chọn loại tìm đường.")
        @Pattern(regexp = "CURRENT_TO_POINT|POINT_TO_POINT", message = "Loại tìm đường không hợp lệ.")
        String searchType,
        @DecimalMin(value = "-90", message = "Vĩ độ phải từ -90 đến 90.")
        @DecimalMax(value = "90", message = "Vĩ độ phải từ -90 đến 90.")
        Double startLatitude,
        @DecimalMin(value = "-180", message = "Kinh độ phải từ -180 đến 180.")
        @DecimalMax(value = "180", message = "Kinh độ phải từ -180 đến 180.")
        Double startLongitude,
        @Positive(message = "Mã điểm xuất phát phải lớn hơn 0.") Long startPointId,
        @NotNull(message = "Vui lòng chọn điểm đến.")
        @Positive(message = "Mã điểm đến phải lớn hơn 0.") Long endPointId) {
}
