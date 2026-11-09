CREATE SEQUENCE accounts_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE delivery_points_seq START WITH 100 INCREMENT BY 1;
CREATE SEQUENCE history_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE accounts (
    account_id NUMBER(19) PRIMARY KEY,
    username VARCHAR2(100 CHAR) NOT NULL UNIQUE,
    password_hash VARCHAR2(255 CHAR) NOT NULL,
    role VARCHAR2(20 CHAR) NOT NULL,
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    full_name VARCHAR2(200 CHAR),
    phone VARCHAR2(30 CHAR),
    CONSTRAINT accounts_role_ck CHECK (role IN ('ADMIN', 'USER', 'DRIVER')),
    CONSTRAINT accounts_active_ck CHECK (is_active IN (0, 1))
);

CREATE TABLE road_nodes (
    node_id NUMBER(19) PRIMARY KEY,
    node_name VARCHAR2(200 CHAR) NOT NULL,
    latitude NUMBER(10, 7) NOT NULL,
    longitude NUMBER(10, 7) NOT NULL,
    CONSTRAINT nodes_lat_ck CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT nodes_lng_ck CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE road_edges (
    edge_id NUMBER(19) PRIMARY KEY,
    source_node_id NUMBER(19) NOT NULL REFERENCES road_nodes (node_id),
    target_node_id NUMBER(19) NOT NULL REFERENCES road_nodes (node_id),
    length_m NUMBER(14, 3) NOT NULL,
    road_name VARCHAR2(200 CHAR) NOT NULL,
    CONSTRAINT edges_length_ck CHECK (length_m > 0)
);

CREATE TABLE delivery_points (
    point_id NUMBER(19) PRIMARY KEY,
    point_name VARCHAR2(200 CHAR) NOT NULL,
    address VARCHAR2(500 CHAR) NOT NULL,
    latitude NUMBER(10, 7) NOT NULL,
    longitude NUMBER(10, 7) NOT NULL,
    node_id NUMBER(19) REFERENCES road_nodes (node_id),
    created_by VARCHAR2(100 CHAR) NOT NULL REFERENCES accounts (username),
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    is_deleted NUMBER(1) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT points_lat_ck CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT points_lng_ck CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT points_active_ck CHECK (is_active IN (0, 1)),
    CONSTRAINT points_deleted_ck CHECK (is_deleted IN (0, 1)),
    CONSTRAINT points_deleted_active_ck CHECK (is_deleted = 0 OR is_active = 0)
);

CREATE TABLE history (
    history_id NUMBER(19) PRIMARY KEY,
    driver_id NUMBER(19) NOT NULL REFERENCES accounts (account_id),
    search_type VARCHAR2(30 CHAR) NOT NULL,
    start_point_id NUMBER(19) REFERENCES delivery_points (point_id),
    start_point_name VARCHAR2(200 CHAR),
    end_point_id NUMBER(19) NOT NULL REFERENCES delivery_points (point_id),
    end_point_name VARCHAR2(200 CHAR) NOT NULL,
    start_node_id NUMBER(19) REFERENCES road_nodes (node_id),
    distance_m NUMBER(14, 3),
    status VARCHAR2(20 CHAR) NOT NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT history_type_ck CHECK (search_type IN ('CURRENT_TO_POINT', 'POINT_TO_POINT')),
    CONSTRAINT history_status_ck CHECK (status IN ('COMPLETED', 'NO_PATH', 'FAILED')),
    CONSTRAINT history_distance_ck CHECK (distance_m IS NULL OR distance_m >= 0)
);

CREATE INDEX edges_source_idx ON road_edges (source_node_id);
CREATE INDEX edges_target_idx ON road_edges (target_node_id);
CREATE INDEX points_node_idx ON delivery_points (node_id);
CREATE INDEX points_creator_idx ON delivery_points (created_by);
CREATE INDEX history_driver_date_idx ON history (driver_id, searched_at);
CREATE INDEX history_start_point_idx ON history (start_point_id);
CREATE INDEX history_end_point_idx ON history (end_point_id);
CREATE INDEX history_start_node_idx ON history (start_node_id);
