const { csrfProtection, rejectNoSqlOperators } = require('./security');
const { authorize } = require('./auth');
const { detectFileType } = require('./upload');

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

test('rejects missing CSRF tokens for authenticated state changes', () => {
  const res = response();
  csrfProtection({ method: 'POST', cookies: { auth_token: 'session' }, get: () => '', user: { csrfToken: 'a'.repeat(64) } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(403);
});

test('enforces role authorization server-side', () => {
  const res = response();
  authorize('admin')({ user: { role: 'staff' } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(403);
});

test('rejects NoSQL operator input', () => {
  const res = response();
  rejectNoSqlOperators({ body: { $where: 'return true' }, query: {}, params: {} }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(400);
});

test('accepts image signatures and rejects a disguised executable upload', () => {
  expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
  expect(detectFileType(Buffer.from('MZ executable payload'))).toBeNull();
});
