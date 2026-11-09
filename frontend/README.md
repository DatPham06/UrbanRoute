# UrbanRoute frontend

Giao diện React + TypeScript, chạy độc lập với backend Spring Boot trong `../backend`.

## Chạy trên máy

Cần Node.js 22.18 trở lên. Trong thư mục `frontend`, chạy:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Mở `http://localhost:3000`. Mặc định frontend gọi `http://localhost:8080`;
anh cần cấu hình Oracle và khởi động backend theo README ở thư mục gốc.

Biến `VITE_API_BASE_URL` trong `.env` là địa chỉ backend. Không đặt mật khẩu
Oracle, JWT secret hoặc thông tin bí mật trong biến `VITE_*`: Vite đưa chúng
vào mã gửi đến trình duyệt.

## Chạy demo giao diện

Đổi `VITE_USE_MOCK_API=true` trong `.env` và khởi động lại Vite để dùng dữ liệu
mô phỏng trong trình duyệt, không cần backend. Tài khoản demo:
`admin/admin123` và `driver/driver123`. Dữ liệu demo này độc lập với Oracle.

Bản đồ hiện dùng Leaflet/OpenStreetMap; không bắt buộc Google Maps API key.

## Kiểm tra

```powershell
npm run lint
npm test
npm run build
```

`lint` kiểm tra kiểu TypeScript. `test` chạy các unit test hiện có cho định dạng,
kiểm tra dữ liệu và Dijkstra trong chế độ demo. `build` tạo bản production trong `dist/`.
