package com.urbanroute.application.port;

import com.urbanroute.domain.model.RoadEdge;
import com.urbanroute.domain.model.RoadNode;
import java.util.List;

public interface RoadRepository {
    List<RoadNode> findNodes();

    List<RoadEdge> findEdges();
}
