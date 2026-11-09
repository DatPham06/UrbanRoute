package com.urbanroute.presentation.route;

import com.urbanroute.application.route.RouteSearchCommand;
import com.urbanroute.application.route.RouteService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/routes")
public class RouteController {
    private final RouteService routes;

    public RouteController(RouteService routes) {
        this.routes = routes;
    }

    @PostMapping("/shortest")
    public RouteResponse shortest(@Valid @RequestBody RouteSearchRequest request,
                                  @AuthenticationPrincipal Jwt jwt) {
        long driverId = Long.parseLong(jwt.getClaimAsString("accountId"));
        var command = new RouteSearchCommand(request.searchType(), request.startLatitude(), request.startLongitude(),
                request.startPointId(), request.endPointId());
        return RouteResponse.from(routes.computeShortestRoute(command, driverId));
    }
}
