package com.urbanroute.domain.routing;

public final class GeoUtils {
    private static final double EARTH_RADIUS_METERS = 6_371_000;

    private GeoUtils() {
    }

    /** Khoảng cách đường chim bay giữa hai tọa độ trên bề mặt Trái Đất. */
    public static double haversineMeters(double latitude1, double longitude1,
                                         double latitude2, double longitude2) {
        double latitudeDelta = Math.toRadians(latitude2 - latitude1);
        double longitudeDelta = Math.toRadians(longitude2 - longitude1);
        double a = Math.pow(Math.sin(latitudeDelta / 2), 2)
                + Math.cos(Math.toRadians(latitude1)) * Math.cos(Math.toRadians(latitude2))
                * Math.pow(Math.sin(longitudeDelta / 2), 2);
        // Giới hạn sai số dấu phẩy động để sqrt không nhận số âm ở hai cực.
        a = Math.max(0, Math.min(1, a));
        return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
