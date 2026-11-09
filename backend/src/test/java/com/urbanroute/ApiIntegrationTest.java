package com.urbanroute;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApiIntegrationTest {
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwords;

    @Test
    void loginReturnsSignedTokenAndSafeAccountAndRejectsBadCredentials() throws Exception {
        JsonNode session = login("admin", "admin123");
        assertThat(session.path("user").path("isActive").asBoolean()).isTrue();
        assertThat(session.path("user").path("role").asText()).isEqualTo("ADMIN");
        assertThat(session.path("user").has("passwordHash")).isFalse();
        assertThat(session.path("token").asText().split("\\.")).hasSize(3);
        String hash = jdbc.queryForObject("SELECT password_hash FROM accounts WHERE username = 'admin'", String.class);
        assertThat(hash).isNotEqualTo("admin123");
        assertThat(passwords.matches("admin123", hash)).isTrue();

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").isString());
        jdbc.update("UPDATE accounts SET is_active = 0 WHERE username = 'driver'");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"driver\",\"password\":\"driver123\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void realTokensEnforceRolesAndAdminCanUseExistingRouteScreen() throws Exception {
        mvc.perform(get("/api/delivery-points")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/history").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
        String driver = token("driver", "driver123");
        mvc.perform(get("/api/admin/delivery-points").header("Authorization", driver))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/delivery-points").header("Authorization", driver))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(10)))
                .andExpect(jsonPath("$[0].isActive").value(true));
        String admin = token("admin", "admin123");
        mvc.perform(get("/api/delivery-points").header("Authorization", admin))
                .andExpect(status().isOk());
        mvc.perform(post("/api/routes/shortest").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(pointRoute(1, 2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void pointCrudPreservesJsonContractAndSoftDeleteHidesThePoint() throws Exception {
        String admin = token("admin", "admin123");
        String driver = token("driver", "driver123");
        String result = mvc.perform(post("/api/admin/delivery-points").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"pointName":"Kho mới","address":"02 Công xã Paris",
                                 "latitude":10.7798,"longitude":106.6990,"isActive":true}
                                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.createdBy").value("admin"))
                .andExpect(jsonPath("$.nodeId").value(104)).andExpect(jsonPath("$.isActive").value(true))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(result).path("pointId").asLong();
        mvc.perform(put("/api/admin/delivery-points/{id}", id).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"pointName\":\"Kho đã đổi\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.pointName").value("Kho đã đổi"));
        mvc.perform(patch("/api/admin/delivery-points/{id}/status", id).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"isActive\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isActive").value(false));
        mvc.perform(post("/api/routes/shortest").header("Authorization", driver)
                        .contentType(MediaType.APPLICATION_JSON).content(pointRoute(2, id)))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/admin/delivery-points/{id}", id).header("Authorization", admin))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT is_deleted FROM delivery_points WHERE point_id = ?",
                Integer.class, id)).isEqualTo(1);
        mvc.perform(get("/api/admin/delivery-points").header("Authorization", admin))
                .andExpect(jsonPath("$", hasSize(12)));
    }

    @Test
    void shortestRoutePersistsHistoryFromTokenAndFeedsDashboard() throws Exception {
        String driver = token("driver", "driver123");
        mvc.perform(post("/api/routes/shortest").header("Authorization", driver)
                        .contentType(MediaType.APPLICATION_JSON).content(pointRoute(1, 2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.distanceMeters").value(850))
                .andExpect(jsonPath("$.pathNodes[0]").value(104))
                .andExpect(jsonPath("$.pathNodes[1]").value(103))
                .andExpect(jsonPath("$.isMockData").value(false));
        mvc.perform(get("/api/history/my").header("Authorization", driver))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].driverUsername").value("driver"))
                .andExpect(jsonPath("$[0].searchedAt").isString());
        String admin = token("admin", "admin123");
        mvc.perform(get("/api/history/my").header("Authorization", admin))
                .andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/admin/history").header("Authorization", admin))
                .andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/admin/dashboard/stats").header("Authorization", admin))
                .andExpect(jsonPath("$.successfulSearches").value(1))
                .andExpect(jsonPath("$.totalDeliveryPoints").value(12))
                .andExpect(jsonPath("$.isMockData").value(false));
        mvc.perform(get("/api/admin/dashboard/trends?days=7").header("Authorization", admin))
                .andExpect(jsonPath("$", hasSize(7))).andExpect(jsonPath("$[6].completed").value(1));
        mvc.perform(get("/api/admin/dashboard/top-destinations?limit=1").header("Authorization", admin))
                .andExpect(jsonPath("$[0].pointId").value(2)).andExpect(jsonPath("$[0].searchCount").value(1));
    }

    @Test
    void gpsOutsideNetworkReturnsNoPathAndRecordsAttempt() throws Exception {
        String driver = token("driver", "driver123");
        mvc.perform(post("/api/routes/shortest").header("Authorization", driver)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"searchType":"CURRENT_TO_POINT","startLatitude":0,
                                 "startLongitude":0,"endPointId":1}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NO_PATH"))
                .andExpect(jsonPath("$.start.latitude").value(0))
                .andExpect(jsonPath("$.end.latitude").value(10.7798))
                .andExpect(jsonPath("$.pathNodes", hasSize(0)));
        mvc.perform(get("/api/history/my").header("Authorization", driver))
                .andExpect(jsonPath("$[0].status").value("NO_PATH"));
    }

    @Test
    void invalidRequestsDoNotWriteHistoryAndCorsAllowsReactOrigin() throws Exception {
        String driver = token("driver", "driver123");
        mvc.perform(post("/api/routes/shortest").header("Authorization", driver)
                        .contentType(MediaType.APPLICATION_JSON).content(pointRoute(1, 1)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isString());
        mvc.perform(get("/api/history/my").header("Authorization", driver))
                .andExpect(jsonPath("$", hasSize(0)));
        String admin = token("admin", "admin123");
        mvc.perform(get("/api/admin/dashboard/trends?days=0").header("Authorization", admin))
                .andExpect(status().isBadRequest());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/auth/login")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    private JsonNode login(String username, String password) throws Exception {
        String body = json.writeValueAsString(java.util.Map.of("username", username, "password", password));
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }

    private String token(String username, String password) throws Exception {
        return "Bearer " + login(username, password).path("token").asText();
    }

    private String pointRoute(long start, long end) {
        return "{\"searchType\":\"POINT_TO_POINT\",\"startPointId\":" + start + ",\"endPointId\":" + end + "}";
    }
}
