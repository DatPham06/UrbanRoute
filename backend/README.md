# UrbanRoute Backend

REST API dùng **Java 21, Spring Boot 3.5.16 và Oracle Database 23ai**. React chạy riêng tại cổng `3000`, backend mặc định chạy tại cổng `8080`.

## Chạy backend

Anh cần JDK 21 và Oracle 23ai đang chạy. Dùng hướng dẫn trong bộ `UrbanRoute-database` lưu riêng để tạo PDB `URBANROUTE` và user `urbanroute`. Chạy `02-create-schema.sql` để tạo bảng, rồi `03-seed-road-graph.sql` để nạp mạng đường khi cần. Sau đó chạy các lệnh PowerShell sau từ thư mục gốc project.

```powershell
cd backend

# Chỉ sao chép khi chưa có cấu hình riêng.
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}

# Mở .env và chỉnh kết nối, mật khẩu, JWT_SECRET trước khi chạy.
.\mvnw.cmd spring-boot:run
```

**Maven Wrapper** là bộ script tải và chạy đúng phiên bản Maven của project; anh không cần cài Maven riêng. Lần đầu chạy cần Internet để tải Maven và dependencies, tức các thư viện project sử dụng.

Backend đọc `.env` theo cú pháp Java properties: viết `KEY=value`, **không bọc giá trị bằng dấu nháy**. Hai biến bắt buộc khi chạy ứng dụng là `DB_PASSWORD` và `JWT_SECRET`; secret cần ít nhất 32 byte. Kiểm tra thêm:

| Biến | Ý nghĩa |
| --- | --- |
| `DB_URL` | URL JDBC tới Oracle; mẫu `jdbc:oracle:thin:@//localhost:1521/URBANROUTE` |
| `DB_USERNAME` | User ứng dụng, mặc định `urbanroute` |
| `SERVER_PORT` | Cổng backend, mặc định `8080` |
| `CORS_ALLOWED_ORIGINS` | Các địa chỉ frontend được phép gọi API, phân cách bằng dấu phẩy |
| `APP_DEMO_DATA_ENABLED` | Bật tạo dữ liệu học tập khi đặt `true`; ứng dụng mặc định `false` |

File `.env.example` đặt `APP_DEMO_DATA_ENABLED=false`. Để có tài khoản `admin/admin123`, `driver/driver123` và 12 địa điểm, anh chạy `database/04-seed-demo.sql` một lần. BCrypt là hàm băm một chiều dùng để lưu mật khẩu.

Ứng dụng thật mặc định **tắt Flyway** để sử dụng schema anh đã tạo bằng SQL theo database-first. Các file migration cũ được giữ phục vụ tests H2, nơi Flyway được bật riêng. Backend không tự tạo bảng khi khởi động; cần chạy script SQL trước.

Kiểm tra ứng dụng tại [health endpoint](http://localhost:8080/actuator/health). Frontend cần `VITE_API_BASE_URL=http://localhost:8080` và `VITE_USE_MOCK_API=false`.

## Clean Architecture

Các package dưới `com.urbanroute` chia theo vai trò trong ứng dụng.

```text
com.urbanroute/
├── domain/          Mô hình dữ liệu và thuật toán Dijkstra
├── application/     Use case, dữ liệu đầu vào và các interface trong port/
├── infrastructure/  Repository JDBC, JWT, transaction và cấu hình Spring
└── presentation/    Controller, dữ liệu HTTP và ánh xạ lỗi sang mã HTTP
```

Domain và Application dùng Java thuần. Use case là một thao tác nghiệp vụ, ví dụ tìm tuyến rồi lưu lịch sử. Một **port** là interface cho biết use case cần thao tác nào từ bên ngoài, chẳng hạn `RoadRepository.findNodes()` để lấy các nút đường.

Khi nhận `POST /api/routes/shortest`, `RouteController` kiểm tra request và tạo `RouteSearchCommand`. `RouteService` lấy mạng đường qua `RoadRepository`, gọi Dijkstra trong Domain rồi lưu kết quả qua `HistoryRepository`. Các lớp `JdbcRoadRepository` và `JdbcHistoryRepository` hiện thực những interface đó bằng SQL. `RouteController` chuyển kết quả thành JSON có định dạng của API.

`UseCaseConfig` tạo các Service bằng **Constructor Injection**, tức truyền các đối tượng cần dùng qua constructor. `SpringTransactionRunner` quản lý transaction ở Infrastructure. Transaction gom các thao tác database của một use case vào cùng một lần ghi hoặc hoàn tác khi gặp lỗi.

## API hiện có

Đăng nhập trả `{token, user}`. Các API còn lại nhận header `Authorization: Bearer <token>`; token JWT là chuỗi có chữ ký dùng xác nhận phiên đăng nhập. Response trả trực tiếp object hoặc array; lỗi có trường `message`.

| Method | Đường dẫn | Quyền |
| --- | --- | --- |
| POST | `/api/auth/login` | Công khai |
| GET | `/api/delivery-points` | ADMIN / tài xế |
| GET | `/api/admin/delivery-points` | ADMIN |
| POST | `/api/admin/delivery-points` | ADMIN |
| PUT | `/api/admin/delivery-points/{id}` | ADMIN |
| PATCH | `/api/admin/delivery-points/{id}/status` | ADMIN |
| DELETE | `/api/admin/delivery-points/{id}` | ADMIN |
| POST | `/api/routes/shortest` | ADMIN / tài xế |
| GET | `/api/history/my` | ADMIN / tài xế |
| GET | `/api/admin/history` | ADMIN |
| GET | `/api/admin/dashboard/stats` | ADMIN |
| GET | `/api/admin/dashboard/trends?days=7` | ADMIN |
| GET | `/api/admin/dashboard/top-destinations?limit=5` | ADMIN |

Role `USER` và `DRIVER` đều là tài xế. ADMIN được dùng màn tìm đường hiện có. Account thực hiện tìm tuyến và xem lịch sử cá nhân được lấy từ token phía server.

## Quy tắc dữ liệu

- `DELETE` thực hiện xóa mềm: đặt `is_deleted=1`, `is_active=0`, ẩn khỏi danh sách và giữ history. Địa điểm chỉ tạm tắt bằng PATCH vẫn có trong danh sách admin.
- Dijkstra chạy trên graph có hướng: mỗi cạnh chỉ đi từ `source_node_id` tới `target_node_id`. Tọa độ được nối với node gần nhất trong phạm vi 5 km; ngoài phạm vi hoặc không có đường nối sẽ trả `NO_PATH`.
- Graph mẫu có **17 nodes và 42 edges**, phục vụ đồ án. Các đoạn từ địa điểm tới node được ước lượng bằng khoảng cách đường chim bay; geometry hiện nối các tọa độ graph nên chưa mô tả đầy đủ đường phố thực tế. Thuật toán chạy bằng Java trên dữ liệu bảng Oracle.
- Timestamp do ứng dụng tạo dùng giờ Việt Nam `Asia/Ho_Chi_Minh`, trả dạng ISO local như `2026-11-04T14:30:00`, chưa kèm offset.
- `activeDriversCount` là số account khác nhau đã có ít nhất một lần tìm đường. Dashboard hiện đọc dữ liệu và tổng hợp trong Java, phù hợp quy mô nhỏ của đồ án.

## Chạy tests và kiểm tra Java

```powershell
.\mvnw.cmd test
```

Các integration tests dùng **H2 trong Oracle mode**, database trong bộ nhớ hỗ trợ kiểm tra luồng SQL và API. Chạy thực tế vẫn dùng Oracle 23ai; H2 chưa chứng minh mọi hành vi riêng của Oracle.

Nếu Maven không nhận Java hoặc Java trên PATH chạy sai, đặt `JAVA_HOME` tới thư mục **JDK 21**, không tới thư mục `bin`, rồi kiểm tra:

```powershell
& "$env:JAVA_HOME\bin\java.exe" -version
.\mvnw.cmd -version
```

Máy hiện tại có JDK 21 tại `C:\androi\jdk` theo thông tin cài đặt Windows; anh có thể dùng đường dẫn này nếu thư mục vẫn tồn tại. Project không cố định đường dẫn JDK để dùng được trên máy khác.
