package com.urbanroute.infrastructure.persistence;

import com.urbanroute.application.port.RoadRepository;
import com.urbanroute.domain.model.RoadEdge;
import com.urbanroute.domain.model.RoadNode;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcRoadRepository implements RoadRepository {
    private final JdbcTemplate jdbc;

    public JdbcRoadRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<RoadNode> findNodes() {
        return jdbc.query("SELECT node_id, node_name, latitude, longitude FROM road_nodes ORDER BY node_id",
                (rs, row) -> new RoadNode(rs.getLong("node_id"), rs.getString("node_name"),
                        rs.getDouble("latitude"), rs.getDouble("longitude")));
    }

    @Override
    public List<RoadEdge> findEdges() {
        return jdbc.query("""
                SELECT edge_id, source_node_id, target_node_id, length_m, road_name
                FROM road_edges ORDER BY edge_id
                """, (rs, row) -> new RoadEdge(rs.getLong("edge_id"), rs.getLong("source_node_id"),
                rs.getLong("target_node_id"), rs.getDouble("length_m"), rs.getString("road_name")));
    }
}
