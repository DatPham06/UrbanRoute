import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDistance, formatDateTime, getSearchTypeLabel, getStatusBadgeConfig } from './formatters.ts';

test('formatDistance converts meters to human readable string', () => {
  assert.equal(formatDistance(0), '0 m');
  assert.equal(formatDistance(500), '500 m');
  assert.equal(formatDistance(999), '999 m');
  assert.equal(formatDistance(1000), '1 km');
  assert.equal(formatDistance(2450), '2.45 km');
  assert.equal(formatDistance(15200), '15.2 km');
  assert.equal(formatDistance(null), '0 m');
  assert.equal(formatDistance(undefined), '0 m');
});

test('getSearchTypeLabel returns accurate Vietnamese label', () => {
  assert.equal(getSearchTypeLabel('CURRENT_TO_POINT'), 'Vị trí hiện tại → Điểm đến');
  assert.equal(getSearchTypeLabel('POINT_TO_POINT'), 'Điểm xuất phát → Điểm đến');
});

test('getStatusBadgeConfig assigns correct variants', () => {
  assert.equal(getStatusBadgeConfig('COMPLETED').variant, 'success');
  assert.equal(getStatusBadgeConfig('NO_PATH').variant, 'warning');
  assert.equal(getStatusBadgeConfig('FAILED').variant, 'danger');
});

test('formatDateTime handles empty or valid dates gracefully', () => {
  assert.equal(formatDateTime(null), '--');
  assert.equal(formatDateTime(''), '--');
  const formatted = formatDateTime('2026-10-18T10:30:00Z');
  assert.ok(formatted.length > 5);
});
