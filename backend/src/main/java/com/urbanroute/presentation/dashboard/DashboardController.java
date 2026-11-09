package com.urbanroute.presentation.dashboard;

import com.urbanroute.application.dashboard.DashboardService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public DashboardService.Stats stats() {
        return service.stats();
    }

    @GetMapping("/trends")
    public List<DashboardService.Trend> trends(@RequestParam(defaultValue = "7") @Min(1) @Max(90) int days) {
        return service.trends(days);
    }

    @GetMapping("/top-destinations")
    public List<DashboardService.TopDestination> topDestinations(
            @RequestParam(defaultValue = "5") @Min(1) @Max(50) int limit) {
        return service.topDestinations(limit);
    }
}
