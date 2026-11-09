# UrbanRoute

Ứng dụng tìm tuyến vận chuyển đô thị TP.HCM, tách thành **React frontend**, **Java Spring Boot backend** và **Oracle Database 23ai**.

```text
UrbanRoute/
├── frontend/       # React 19, TypeScript, Vite, Tailwind, bản đồ
├── backend/        # Java 21, Spring Boot 3.5.16, Spring Security, Spring JDBC
├── package.json    # Các lệnh tiện ích chuyển tiếp tới frontend
└── README.md
```

Luồng dữ liệu: **React (port 3000) → REST API Spring Boot (port 8080) → Oracle (port 1521, service URBANROUTE)**. REST API là các đường HTTP dùng JSON để hai ứng dụng trao đổi dữ liệu. React không kết nối trực tiếp database.

## 1. Chuẩn bị Oracle 23ai

Dùng Oracle Database 23ai Free đang có trên máy, hoặc cài một instance mới. Các script SQL và hướng dẫn nằm trong bộ `UrbanRoute-database` được lưu riêng. Kết nối `SYS AS SYSDBA`, chạy `00-create-pdb.sql` nếu chưa có PDB `URBANROUTE`, rồi chạy `01-create-user.sql` nếu chưa có user `urbanroute` trong PDB. PDB là database con chứa schema ứng dụng. Điều chỉnh đường dẫn datafile trong script theo môi trường cài Oracle.

Thông số kết nối local là `localhost:1521/URBANROUTE` và user `urbanroute`. Điền mật khẩu Oracle của môi trường hiện tại trong `backend/.env`. PDB mới có dữ liệu riêng.

Project dùng **database-first**. Đăng nhập DBeaver bằng user `urbanroute`, chạy `02-create-schema.sql` để tạo bảng, rồi chạy `03-seed-road-graph.sql` để nạp mạng đường. File `04-seed-demo.sql` dùng để nạp tài khoản và địa điểm mẫu khi cần. Backend mặc định tắt Flyway và tắt tự nạp demo.

## 2. Chạy backend

Yêu cầu **JDK 21**. Maven Wrapper đã có trong repo nên không cần cài Maven riêng; lần chạy đầu cần Internet để tải Maven và dependencies.

Mở PowerShell tại thư mục project:

```powershell
cd backend
# Chỉ sao chép khi chưa có .env để giữ cấu hình hiện tại.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Sửa DB_URL, DB_USERNAME, DB_PASSWORD và JWT_SECRET trong .env theo máy anh.
.\mvnw.cmd spring-boot:run
```

Spring Boot tự đọc `backend/.env` theo cú pháp properties, **không bọc giá trị bằng dấu nháy**. Chạy lệnh từ `backend/` để đọc đúng file này. `JAVA_HOME` phải trỏ tới JDK 21; nếu `java -version` bị treo ở launcher, kiểm tra và dùng đường dẫn JDK thật.

API: `http://localhost:8080`. Kiểm tra trạng thái: `http://localhost:8080/actuator/health`.

File `04-seed-demo.sql` tạo tài khoản học tập. Thông tin đăng nhập mẫu nằm trong hướng dẫn đi kèm bộ script SQL.

Mật khẩu lưu bằng BCrypt (hàm băm một chiều), đăng nhập trả JWT (token có chữ ký để xác thực yêu cầu API). Mẫu `.env` đặt `APP_DEMO_DATA_ENABLED=false` để backend không tự nạp dữ liệu. Khi dùng dữ liệu thật, thay password/JWT secret mẫu.

## 3. Chạy frontend

Mở PowerShell thứ hai tại thư mục project:

```powershell
cd frontend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run dev
```

Mở `http://localhost:3000`. Mặc định frontend gọi backend thật:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK_API=false
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

Không cần Google Maps API key để dùng bản đồ Leaflet/OpenStreetMap hiện có; việc tải nền bản đồ cần Internet. Muốn chạy giao diện độc lập để học, đổi `VITE_USE_MOCK_API=true` rồi khởi động lại Vite. Chế độ mock mô phỏng dữ liệu trong trình duyệt và không lưu vào Oracle.

Có thể chạy `npm run dev`, `npm run build`, `npm run lint`, `npm test` từ root sau khi cài dependencies trong `frontend/`. Frontend sử dụng npm và `package-lock.json`.

## 4. Kiểm tra

Frontend:

```powershell
cd frontend
npm run lint
npm test
npm run build
```

Backend:

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd package
```

Tests backend dùng H2 ở chế độ tương thích cú pháp Oracle để kiểm tra migrations, Repository, Dijkstra, đăng nhập JWT, phân quyền, CRUD, history và dashboard. **H2 chỉ dùng trong tests**; ứng dụng thật cấu hình Oracle JDBC. Tests H2 không thay thế lượt kiểm thử trên Oracle 23ai thật.

## 5. Cách đọc backend

- **Controller** nhận HTTP, kiểm tra dữ liệu đầu vào và gọi Service.
- **Service** xử lý nghiệp vụ, ví dụ tìm tuyến và ghi lịch sử trong cùng transaction (một nhóm thao tác database cùng thành công hoặc cùng hoàn tác).
- **Repository** dùng `JdbcTemplate` để chạy SQL với tham số, không ghép dữ liệu người dùng vào câu SQL.
- **DTO** là cấu trúc dữ liệu trao đổi qua API; các Java `record` khai báo gọn những dữ liệu này. Bản này dùng JDBC nên không có JPA Entity.

Các phần dùng Constructor Injection: Spring truyền dependency qua constructor, giúp nhìn rõ lớp nào cần lớp nào. Chưa thêm nhiều layer Clean Architecture để giữ project vừa sức học.

Điểm bị xóa được đánh dấu `IS_DELETED=1`, ẩn khỏi danh sách và giữ bản ghi để lịch sử không mất liên kết. Vai trò `USER` trong database được React hiển thị là tài xế; ADMIN vẫn dùng được màn tìm đường như giao diện cũ.

Dijkstra chạy trên Java, đọc graph có hướng từ `ROAD_NODES`/`ROAD_EDGES` trong Oracle. Dữ liệu mẫu có **17 nút, 42 cạnh và 12 địa điểm**, chưa phải mạng giao thông đầy đủ. Các đoạn nối từ tọa độ tới nút gần nhất là ước lượng đường chim bay trong phạm vi 5 km. Chưa triển khai Oracle SQL Property Graph/`GRAPH_TABLE`.

Timestamps ứng dụng ghi dùng giờ Việt Nam `Asia/Ho_Chi_Minh`, trả JSON ISO-8601 không kèm offset. `activeDriversCount` là số tài khoản khác nhau đã tìm đường; dashboard hiện tổng hợp trong Java, phù hợp dữ liệu nhỏ của đồ án.

Xem thêm [frontend](frontend/README.md) và [backend và danh sách API](backend/README.md).

Tài liệu công nghệ: [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [Spring Security JWT](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html), [Oracle Database 23ai](https://docs.oracle.com/en/database/oracle/oracle-database/23/).
