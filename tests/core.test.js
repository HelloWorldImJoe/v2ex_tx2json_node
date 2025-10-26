const { extractFieldsFromHtml, extractAvatarAndName } = require('../lib/core');

test('extract avatar and name from img tag', () => {
  const html = '<div><img src="/avatar.png" alt="alice" data-uid="123"></div>';
  const res = extractAvatarAndName(html);
  expect(res.username).toBe('alice');
  expect(res.avatar).toBe('/avatar.png');
  expect(res.uid).toBe('123');
});

test('extract fields from sample html', () => {
  const sample = `
  <table>
    <tr><td>交易哈希</td><td>0xABC</td></tr>
    <tr><td>发送方</td><td><img src="/a.png" alt="bob" data-uid="42"></td></tr>
    <tr><td>接收方</td><td>Charlie</td></tr>
    <tr><td>数额</td><td>1,234.56 USDT</td></tr>
    <tr><td>发送时间</td><td>2025-01-01</td></tr>
  </table>
  `;

  const obj = extractFieldsFromHtml(sample);
  expect(obj.tx_hash).toBe('0xABC');
  expect(obj.sender.username).toBe('bob');
  expect(obj.receiver.username).toBe('Charlie');
  expect(obj.amount_value).toBeCloseTo(1234.56);
});

test('memo containing topic extracts topic_id', () => {
  const sample = `
  <table>
    <tr><td>\u4ea4\u6613\u54c8\u5e0c</td><td>0xDEF</td></tr>
    <tr><td>Memo</td><td>topic:98765</td></tr>
  </table>
  `;

  const obj = extractFieldsFromHtml(sample);
  expect(obj).not.toBeNull();
  expect(obj.memo).toBe('topic:98765');
  expect(obj.topic_id).toBe(98765);
});
