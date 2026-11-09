import test from 'node:test';
import assert from 'node:assert/strict';
import { DijkstraRouter } from './dijkstraEngine.ts';

test('DijkstraRouter computes shortest path between connected nodes', () => {
  const router = new DijkstraRouter();
  // Node 101 (Phù Đổng) to Node 103 (Bến Thành) has direct edge with length 700
  const result = router.computeShortestPath(101, 103);
  assert.ok(result !== null);
  assert.equal(result.distanceMeters, 700);
  assert.deepEqual(result.pathNodeIds, [101, 103]);
});

test('DijkstraRouter computes multi-hop shortest path', () => {
  const router = new DijkstraRouter();
  // Node 101 to 105 (Hang Xanh) via 103 -> 104 -> 105 or 102 -> 110 -> 105
  const result = router.computeShortestPath(101, 105);
  assert.ok(result !== null);
  assert.ok(result.distanceMeters > 0);
  assert.ok(result.pathNodeIds.length >= 3);
  assert.equal(result.pathNodeIds[0], 101);
  assert.equal(result.pathNodeIds[result.pathNodeIds.length - 1], 105);
});

test('DijkstraRouter returns null when no path exists', () => {
  // Graph with disconnected node
  const isolatedRouter = new DijkstraRouter(
    [
      { nodeId: 1, nodeName: 'Node 1', latitude: 10, longitude: 106 },
      { nodeId: 2, nodeName: 'Node 2', latitude: 10.1, longitude: 106.1 },
      { nodeId: 99, nodeName: 'Island', latitude: 12, longitude: 108 }
    ],
    [
      { edgeId: 1, sourceNodeId: 1, targetNodeId: 2, lengthM: 500, roadName: 'R1' }
    ]
  );

  const unreachable = isolatedRouter.computeShortestPath(1, 99);
  assert.equal(unreachable, null);
});

test('DijkstraRouter finds nearest road node for GPS coordinates', () => {
  const router = new DijkstraRouter();
  // GPS near Ben Thanh (10.7725, 106.6980)
  const nearest = router.findNearestNode(10.7726, 106.6981);
  assert.ok(nearest !== null);
  assert.equal(nearest.node.id, 103);
  assert.ok(nearest.distanceM < 50);
});
