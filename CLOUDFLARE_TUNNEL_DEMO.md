# Hướng dẫn demo công khai bằng Cloudflare Tunnel

## Mô tả dự án

MicroServices_QLSV là hệ thống quản lý sinh viên theo kiến trúc microservices. Dự án gồm API Gateway, các service nghiệp vụ nội bộ, Redis, SQL Server và hai giao diện web:

- Web Portal sinh viên: sinh viên đăng nhập, xem thông tin học tập và dùng các chức năng dành cho sinh viên.
- Web Admin / giảng viên / phòng đào tạo: quản trị dữ liệu đào tạo, lớp học, môn học, điểm danh và các nghiệp vụ học vụ.
- API Gateway: cổng API duy nhất cho frontend gọi vào backend.
- Các microservice nội bộ: Auth, Student, Course, Enrollment và Grade.

## Link trực tuyến hiện tại

Các link dưới đây đang được mở bằng Cloudflare Tunnel từ laptop cá nhân:

| Thành phần | Link truy cập |
| --- | --- |
| API Gateway | `https://airlines-optimize-serial-copying.trycloudflare.com` |
| Web Portal sinh viên | `https://ways-element-comparison-scholarship.trycloudflare.com` |
| Web Admin / giảng viên / phòng đào tạo | `https://condition-generating-abstract-consortium.trycloudflare.com` |

Lưu ý: link miễn phí dạng `trycloudflare.com` có thể đổi sau khi tắt tunnel hoặc restart container tunnel. Khi link đổi, cần cập nhật lại `.env`, restart `npm run dev` hoặc rebuild frontend nếu chạy bằng Docker.

## Kịch bản thao tác nhanh trên máy này khi bảo vệ

Đây là phần quan trọng nhất. Khi đến buổi bảo vệ, làm đúng thứ tự dưới đây.

### Bước 1: Mở đúng terminal

Mở **PowerShell** hoặc **Windows Terminal - PowerShell**.

Không dùng `cmd.exe` cho các lệnh có `Select-String`, vì `Select-String` là lệnh của PowerShell. Trong ảnh lỗi trước đó, bạn đang gõ trong `C:\WINDOWS\system32\cmd.exe`, nên mới báo:

```text
'Select-String' is not recognized as an internal or external command
```

Nếu đang ở `cmd.exe`, gõ lệnh này để chuyển sang PowerShell:

```cmd
powershell
```

Sau đó chuyển vào thư mục dự án:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
```

### Bước 2: Bật Docker Desktop

Mở Docker Desktop, đợi góc dưới báo **Engine running**.

Kiểm tra bằng PowerShell:

```powershell
docker info
```

Nếu lỗi, Docker Desktop chưa chạy xong. Chờ thêm rồi chạy lại.

### Bước 3: Bật SQL Server và Redis

Chạy:

```powershell
docker compose up -d mssql redis mssql-init
```

Kiểm tra:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Cần thấy:

```text
microservices_qlsv-mssql-1   Up ... healthy   1433->1433
microservices_qlsv-redis-1   Up ... healthy   6379->6379
```

Nếu `mssql-1` hoặc `redis-1` đang `Exited`, frontend vẫn mở được trang login nhưng đăng nhập/lấy dữ liệu sẽ lỗi.

### Bước 4: Bật toàn bộ backend, microservices và frontend

Mở một cửa sổ PowerShell riêng:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
npm run dev
```

Giữ cửa sổ này mở. Không tắt trong lúc demo.

Chờ đến khi thấy các service báo kiểu:

```text
Nest application successfully started
Ready - started server on 0.0.0.0:4000
Ready - started server on 0.0.0.0:4005
```

Kiểm tra local trên trình duyệt:

```text
http://localhost:3000/api-docs
http://localhost:4000/login
http://localhost:4005/login
```

Nếu 3 link local chưa mở được thì chưa cần mở Cloudflare, phải sửa local trước.

### Bước 5: Tạo link Cloudflare Tunnel mới

Mở thêm một cửa sổ PowerShell khác:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
```

Nếu muốn tạo link mới hoàn toàn, chạy:

```powershell
docker rm -f qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
```

Sau đó chạy 3 lệnh:

```powershell
docker run -d --name qlsv-cf-api --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000
docker run -d --name qlsv-cf-portal --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4000
docker run -d --name qlsv-cf-admin --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4005
```

Nếu đã có sẵn 3 container tunnel và chỉ muốn bật lại:

```powershell
docker start qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
```

### Bước 6: Lấy đúng 3 link mới

Chạy trong **PowerShell**:

```powershell
docker logs qlsv-cf-api 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-portal 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-admin 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
```

Ghi lại theo đúng thứ tự:

```text
API Gateway = link lấy từ qlsv-cf-api
Web Portal  = link lấy từ qlsv-cf-portal
Web Admin   = link lấy từ qlsv-cf-admin
```

Nếu bắt buộc dùng `cmd.exe`, dùng `findstr` thay cho `Select-String`:

```cmd
docker logs qlsv-cf-api 2>&1 | findstr trycloudflare.com
docker logs qlsv-cf-portal 2>&1 | findstr trycloudflare.com
docker logs qlsv-cf-admin 2>&1 | findstr trycloudflare.com
```

### Bước 7: Sửa `.env` theo link mới

Mở file:

```text
D:\MyPepositoryGITHUB\MicroServices_QLSV\.env
```

Sửa đúng các dòng này:

```env
NEXT_PUBLIC_API_URL=https://link-api-moi.trycloudflare.com
WEB_PORTAL_URL=https://link-portal-moi.trycloudflare.com
WEB_ADMIN_URL=https://link-admin-moi.trycloudflare.com
NEXT_PUBLIC_WEB_PORTAL_URL=https://link-portal-moi.trycloudflare.com
NEXT_PUBLIC_WEB_ADMIN_URL=https://link-admin-moi.trycloudflare.com
RESET_PASSWORD_BASE_URL=https://link-admin-moi.trycloudflare.com
CORS_ORIGIN=https://link-portal-moi.trycloudflare.com,https://link-admin-moi.trycloudflare.com
```

Ví dụ đúng với link đang chạy hiện tại:

```env
NEXT_PUBLIC_API_URL=https://airlines-optimize-serial-copying.trycloudflare.com
WEB_PORTAL_URL=https://ways-element-comparison-scholarship.trycloudflare.com
WEB_ADMIN_URL=https://condition-generating-abstract-consortium.trycloudflare.com
NEXT_PUBLIC_WEB_PORTAL_URL=https://ways-element-comparison-scholarship.trycloudflare.com
NEXT_PUBLIC_WEB_ADMIN_URL=https://condition-generating-abstract-consortium.trycloudflare.com
RESET_PASSWORD_BASE_URL=https://condition-generating-abstract-consortium.trycloudflare.com
CORS_ORIGIN=https://ways-element-comparison-scholarship.trycloudflare.com,https://condition-generating-abstract-consortium.trycloudflare.com
```

Không được sửa các dòng service nội bộ sang link Cloudflare:

```env
AUTH_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
ENROLLMENT_SERVICE_URL=http://localhost:3004
GRADE_SERVICE_URL=http://localhost:3005
REDIS_URL=redis://localhost:6379
DATABASE_URL="sqlserver://localhost:1433;database=student_db;user=sa;password=Mdang2186;encrypt=DANGER_PLAINTEXT;trustServerCertificate=true;"
```

### Bước 8: Restart `npm run dev`

Sau khi sửa `.env`, quay lại cửa sổ đang chạy `npm run dev`.

Nhấn:

```text
Ctrl + C
```

Sau đó chạy lại:

```powershell
npm run dev
```

Lý do: Next.js và API Gateway chỉ đọc lại biến môi trường sau khi restart. Nếu không restart, web có thể vẫn gọi link cũ hoặc `localhost`.

### Bước 9: Mở đúng link để demo

Với link hiện tại, mở:

```text
API Gateway:
https://airlines-optimize-serial-copying.trycloudflare.com/api-docs

Web Portal sinh viên:
https://ways-element-comparison-scholarship.trycloudflare.com/login

Web Admin:
https://condition-generating-abstract-consortium.trycloudflare.com/login
```

Nếu trình duyệt báo `DNS_PROBE_FINISHED_NXDOMAIN`, link đó đã hết hiệu lực hoặc bạn đang dùng link cũ. Làm lại từ bước 5 đến bước 8.

### Bước 10: Tài khoản demo đã kiểm tra

Web Admin:

```text
Email: admin@uneti.edu.vn
Mật khẩu: 123456
Vai trò: SUPER_ADMIN
```

Giảng viên:

```text
Email: gv1@uneti.edu.vn
Mật khẩu: 123456
Vai trò: LECTURER
```

Sinh viên:

```text
Email: mdang2186@gmail.com
Mật khẩu: 123456
Vai trò: STUDENT
```

Sinh viên khác:

```text
Email: 221191002@sv.uneti.edu.vn
Mật khẩu: 123456
Vai trò: STUDENT
```

### Bước 11: Kiểm tra chắc chắn dữ liệu public chạy được

Chạy lệnh này trong PowerShell để kiểm tra API public đăng nhập được và lấy được dữ liệu sinh viên:

```powershell
node -e "async function main(){const api='https://airlines-optimize-serial-copying.trycloudflare.com'; const login=await fetch(api+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@uneti.edu.vn',password:'123456'})}); console.log('LOGIN', login.status); const data=await login.json(); console.log('ROLE', data.role, 'TOKEN', Boolean(data.accessToken)); const students=await fetch(api+'/api/students',{headers:{authorization:'Bearer '+data.accessToken}}); console.log('STUDENTS', students.status); const text=await students.text(); console.log(text.slice(0,300));} main().catch(err=>{console.error(err); process.exit(1);});"
```

Kết quả đúng:

```text
LOGIN 201
ROLE SUPER_ADMIN TOKEN true
STUDENTS 200
```

Nếu `LOGIN` là `401`, kiểm tra lại tài khoản/mật khẩu.

Nếu `STUDENTS` không phải `200`, kiểm tra:

- SQL Server có đang `healthy` không.
- `npm run dev` đã restart sau khi sửa `.env` chưa.
- `NEXT_PUBLIC_API_URL` có đúng link API tunnel mới không.
- `CORS_ORIGIN` có đúng link Portal/Admin mới không.

## Quy trình mỗi lần mở máy để bật server demo

Phần này dùng cho mỗi lần mở laptop và muốn bật lại hệ thống để demo trên điện thoại hoặc máy tính bảng.

### 1. Mở PowerShell tại thư mục dự án

Mở PowerShell, sau đó chạy:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
```

Kiểm tra đang ở đúng nhánh làm việc:

```powershell
git branch --show-current
```

Nhánh đang dùng cho cấu hình demo là:

```text
dev-minh
```

### 2. Bật Docker Desktop

Mở Docker Desktop từ Start Menu và chờ đến khi Docker báo đang chạy.

Kiểm tra Docker bằng PowerShell:

```powershell
docker info
```

Nếu lệnh này báo lỗi không kết nối được Docker Engine, hãy mở Docker Desktop và chờ thêm vài phút rồi chạy lại.

### 3. Khởi động SQL Server và Redis

Chạy:

```powershell
docker compose up -d mssql redis mssql-init
```

Kiểm tra container:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Cần thấy ít nhất các container sau đang chạy:

- `microservices_qlsv-mssql-1`
- `microservices_qlsv-redis-1`

Nếu status có chữ `healthy` là tốt nhất.

### 4. Kiểm tra file `.env`

File `.env` ở thư mục gốc phải dùng SQL Server, không dùng PostgreSQL.

Dòng quan trọng nhất phải bắt đầu bằng `sqlserver://`:

```env
DATABASE_URL="sqlserver://localhost:1433;database=student_db;user=sa;password=Mdang2186;encrypt=DANGER_PLAINTEXT;trustServerCertificate=true;"
```

Khi chỉ chạy local, các biến frontend nên là:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
WEB_PORTAL_URL=http://localhost:4000
WEB_ADMIN_URL=http://localhost:4005
NEXT_PUBLIC_WEB_PORTAL_URL=http://localhost:4000
NEXT_PUBLIC_WEB_ADMIN_URL=http://localhost:4005
CORS_ORIGIN=http://localhost:4000,http://localhost:4005
```

Khi chạy demo public bằng Cloudflare Tunnel, các biến này phải đổi sang link tunnel mới. Xem bước 8.

### 5. Chỉ chạy lần đầu hoặc khi database/schema thay đổi

Nếu mới clone dự án, mới cài lại máy, hoặc database chưa có dữ liệu, chạy:

```powershell
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

Nếu hôm trước đã chạy ổn rồi và dữ liệu vẫn còn, mỗi lần mở máy không cần chạy lại seed.

### 6. Chạy toàn bộ backend, microservices và frontend

Mở một cửa sổ PowerShell riêng tại thư mục dự án:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
npm run dev
```

Giữ cửa sổ này mở trong suốt quá trình demo. Nếu tắt cửa sổ này thì API Gateway, microservices và frontend cũng dừng.

Các port cần lên:

| Thành phần | Port |
| --- | ---: |
| API Gateway | 3000 |
| Auth Service | 3001 |
| Student Service | 3002 |
| Course Service | 3003 |
| Enrollment Service | 3004 |
| Grade Service | 3005 |
| Web Portal | 4000 |
| Web Admin | 4005 |

Kiểm tra port bằng PowerShell khác:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,3002,3003,3004,3005,4000,4005 -ErrorAction SilentlyContinue |
  Select-Object LocalPort,OwningProcess |
  Sort-Object LocalPort
```

### 7. Kiểm tra local trước khi public

Mở trình duyệt trên laptop:

- API Gateway: `http://localhost:3000/api-docs`
- Web Portal: `http://localhost:4000/login`
- Web Admin: `http://localhost:4005/login`

Hoặc kiểm tra bằng PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:3000/api-docs -TimeoutSec 30 | Select-Object StatusCode
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:4000/login -TimeoutSec 30 | Select-Object StatusCode
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:4005/login -TimeoutSec 30 | Select-Object StatusCode
```

Kết quả đúng là `StatusCode` bằng `200`.

### 8. Mở Cloudflare Tunnel bằng Docker

Chỉ public 3 thành phần:

- API Gateway
- Web Portal
- Web Admin

Không tạo tunnel cho SQL Server, Redis hoặc từng microservice nội bộ.

Nếu 3 container tunnel đã từng được tạo trước đó, chạy:

```powershell
docker start qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
```

Nếu container chưa tồn tại hoặc muốn tạo lại link mới hoàn toàn, chạy:

```powershell
docker rm -f qlsv-cf-api qlsv-cf-portal qlsv-cf-admin

docker run -d --name qlsv-cf-api --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000
docker run -d --name qlsv-cf-portal --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4000
docker run -d --name qlsv-cf-admin --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4005
```

Xem link tunnel mới:

```powershell
docker logs qlsv-cf-api 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-portal 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-admin 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
```

Ghi lại 3 link theo đúng vai trò:

```text
API Gateway  = https://...trycloudflare.com
Web Portal   = https://...trycloudflare.com
Web Admin    = https://...trycloudflare.com
```

### 9. Cập nhật `.env` theo link tunnel mới

Mở file `.env`, sửa các dòng sau:

```env
NEXT_PUBLIC_API_URL=https://your-api.trycloudflare.com
WEB_PORTAL_URL=https://your-portal.trycloudflare.com
WEB_ADMIN_URL=https://your-admin.trycloudflare.com
NEXT_PUBLIC_WEB_PORTAL_URL=https://your-portal.trycloudflare.com
NEXT_PUBLIC_WEB_ADMIN_URL=https://your-admin.trycloudflare.com
RESET_PASSWORD_BASE_URL=https://your-admin.trycloudflare.com
CORS_ORIGIN=https://your-portal.trycloudflare.com,https://your-admin.trycloudflare.com
```

Ví dụ với link hiện tại:

```env
NEXT_PUBLIC_API_URL=https://airlines-optimize-serial-copying.trycloudflare.com
WEB_PORTAL_URL=https://ways-element-comparison-scholarship.trycloudflare.com
WEB_ADMIN_URL=https://condition-generating-abstract-consortium.trycloudflare.com
NEXT_PUBLIC_WEB_PORTAL_URL=https://ways-element-comparison-scholarship.trycloudflare.com
NEXT_PUBLIC_WEB_ADMIN_URL=https://condition-generating-abstract-consortium.trycloudflare.com
RESET_PASSWORD_BASE_URL=https://condition-generating-abstract-consortium.trycloudflare.com
CORS_ORIGIN=https://ways-element-comparison-scholarship.trycloudflare.com,https://condition-generating-abstract-consortium.trycloudflare.com
```

Không sửa các service nội bộ này sang link public:

```env
AUTH_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
ENROLLMENT_SERVICE_URL=http://localhost:3004
GRADE_SERVICE_URL=http://localhost:3005
REDIS_URL=redis://localhost:6379
DATABASE_URL="sqlserver://localhost:1433;database=student_db;user=sa;password=Mdang2186;encrypt=DANGER_PLAINTEXT;trustServerCertificate=true;"
```

### 10. Restart `npm run dev` sau khi sửa `.env`

Sau khi đổi link tunnel trong `.env`, bắt buộc restart server dev để frontend và API Gateway nhận biến môi trường mới.

Trong cửa sổ đang chạy `npm run dev`, nhấn:

```text
Ctrl + C
```

Sau đó chạy lại:

```powershell
npm run dev
```

Chờ đến khi các service hiện log khởi động xong.

### 11. Kiểm tra link public sau khi restart

Mở trên laptop hoặc điện thoại:

- API Gateway: `https://your-api.trycloudflare.com/api-docs`
- Web Portal: `https://your-portal.trycloudflare.com/login`
- Web Admin: `https://your-admin.trycloudflare.com/login`

Nếu muốn kiểm tra bằng Docker curl:

```powershell
docker run --rm curlimages/curl:latest -I --max-time 30 https://your-api.trycloudflare.com/api-docs
docker run --rm curlimages/curl:latest -I --max-time 30 https://your-portal.trycloudflare.com/login
docker run --rm curlimages/curl:latest -I --max-time 30 https://your-admin.trycloudflare.com/login
```

Kết quả đúng là HTTP `200`.

Kiểm tra CORS từ Web Portal đến API Gateway:

```powershell
docker run --rm curlimages/curl:latest -s -D - -o /dev/null -X OPTIONS -H "Origin: https://your-portal.trycloudflare.com" -H "Access-Control-Request-Method: GET" https://your-api.trycloudflare.com/api-docs
```

Kết quả đúng có các header:

```text
HTTP/2 204
access-control-allow-origin: https://your-portal.trycloudflare.com
access-control-allow-credentials: true
```

### 12. Thứ tự thao tác nhanh mỗi lần demo

Nếu máy đã cài đủ dependencies và database đã có dữ liệu, mỗi lần mở máy chỉ cần làm theo thứ tự này:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
docker compose up -d mssql redis mssql-init
npm run dev
```

Mở PowerShell khác để bật tunnel:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
docker start qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
docker logs qlsv-cf-api 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-portal 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-admin 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
```

Nếu link tunnel đổi, sửa `.env`, sau đó quay lại cửa sổ `npm run dev`, nhấn `Ctrl + C` và chạy lại:

```powershell
npm run dev
```

### 13. Cách tắt sau khi demo xong

Dừng app:

```text
Nhấn Ctrl + C trong cửa sổ đang chạy npm run dev
```

Dừng 3 tunnel public:

```powershell
docker stop qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
```

Nếu muốn dừng cả SQL Server và Redis:

```powershell
docker compose stop mssql redis
```

Nếu hôm sau demo tiếp, chỉ cần bật lại Docker Desktop rồi làm lại từ bước 3.

## A. Mục đích

Cloudflare Tunnel giúp tạo các link HTTPS công khai để điện thoại, máy tính bảng hoặc máy tính khác truy cập hệ thống đang chạy trực tiếp trên laptop cá nhân. Cách này phù hợp khi dữ liệu SQL Server lớn, chưa muốn triển khai database và toàn bộ microservices lên cloud.

Kiến trúc demo:

```text
Người dùng bên ngoài
-> Cloudflare Tunnel
-> Web Portal hoặc Web Admin
-> API Gateway
-> Các microservice nội bộ
-> SQL Server / Redis
```

Chỉ public 3 thành phần qua tunnel:

- API Gateway
- Web Portal sinh viên
- Web Admin / giảng viên / phòng đào tạo

Không tạo tunnel trực tiếp cho SQL Server, Redis, Auth Service, Student Service, Course Service, Enrollment Service hoặc Grade Service.

## B. Các port cần chạy

| Thành phần | Port local | Ghi chú |
| --- | ---: | --- |
| API Gateway | 3000 | Public qua Cloudflare Tunnel |
| Auth Service | 3001 | Nội bộ, Gateway gọi qua `AUTH_SERVICE_URL` |
| Student Service | 3002 | Nội bộ, Gateway gọi qua `STUDENT_SERVICE_URL` |
| Course Service | 3003 | Nội bộ, Gateway gọi qua `COURSE_SERVICE_URL` |
| Enrollment Service | 3004 | Nội bộ, Gateway gọi qua `ENROLLMENT_SERVICE_URL`; Socket.IO điểm danh đi qua Gateway |
| Grade Service | 3005 | Nội bộ, Gateway gọi qua `GRADE_SERVICE_URL` |
| Web Portal sinh viên | 4000 | Public qua Cloudflare Tunnel |
| Web Admin / giảng viên / phòng đào tạo | 4005 | Public qua Cloudflare Tunnel |
| SQL Server | 1433 | Chỉ chạy local, không public tunnel |
| Redis | 6379 | Chỉ chạy local, không public tunnel |

## C. Cách chạy dự án local

Tạo file `.env` ở thư mục gốc từ `.env.example`, sau đó kiểm tra các biến chính:

```env
DATABASE_URL="sqlserver://localhost:1433;database=student_db;user=sa;password=Mdang2186;encrypt=DANGER_PLAINTEXT;trustServerCertificate=true;"
REDIS_URL=redis://localhost:6379
API_GATEWAY_PORT=3000
CORS_ORIGIN=http://localhost:4000,http://localhost:4005
NEXT_PUBLIC_API_URL=http://localhost:3000
WEB_PORTAL_URL=http://localhost:4000
WEB_ADMIN_URL=http://localhost:4005
NEXT_PUBLIC_WEB_PORTAL_URL=http://localhost:4000
NEXT_PUBLIC_WEB_ADMIN_URL=http://localhost:4005
```

Cài dependencies:

```bash
npm install
```

Khởi động SQL Server và Redis:

```bash
docker compose up -d mssql redis mssql-init
```

Hoặc trên PowerShell:

```powershell
.\start-infra.ps1
```

Đồng bộ schema và seed dữ liệu:

```bash
npm run db:push
npm run db:seed
```

Chạy toàn bộ monorepo ở chế độ dev:

```bash
npm run dev
```

Nếu muốn chạy toàn bộ bằng Docker Compose:

```bash
npm run docker:up
```

Sau khi chạy, kiểm tra:

- API Gateway: `http://localhost:3000/api-docs`
- Web Portal: `http://localhost:4000`
- Web Admin: `http://localhost:4005`

## D. Cách mở Cloudflare Tunnel

Cách 1: dùng `cloudflared` cài trực tiếp trên Windows. Cài `cloudflared` trước, sau đó mở 3 cửa sổ PowerShell riêng.

Cửa sổ 1, public API Gateway:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Cửa sổ 2, public Web Portal:

```powershell
cloudflared tunnel --url http://localhost:4000
```

Cửa sổ 3, public Web Admin:

```powershell
cloudflared tunnel --url http://localhost:4005
```

Mỗi lệnh sẽ in ra một link HTTPS dạng `https://...trycloudflare.com`. Đặt tên dễ nhớ khi ghi lại:

- `https://your-api.trycloudflare.com`
- `https://your-portal.trycloudflare.com`
- `https://your-admin.trycloudflare.com`

Cách 2: dùng Docker nếu máy chưa chạy được file `cloudflared.exe`.

```powershell
docker run -d --name qlsv-cf-api --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000
docker run -d --name qlsv-cf-portal --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4000
docker run -d --name qlsv-cf-admin --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4005
```

Xem link tunnel trong log:

```powershell
docker logs qlsv-cf-api
docker logs qlsv-cf-portal
docker logs qlsv-cf-admin
```

Nếu cần tạo lại link mới:

```powershell
docker rm -f qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
```

Sau đó chạy lại 3 lệnh `docker run` ở trên.

## E. Cách sửa `.env` khi có link tunnel

Sau khi có 3 link tunnel, sửa `.env`:

```env
NEXT_PUBLIC_API_URL=https://your-api.trycloudflare.com
WEB_PORTAL_URL=https://your-portal.trycloudflare.com
WEB_ADMIN_URL=https://your-admin.trycloudflare.com
NEXT_PUBLIC_WEB_PORTAL_URL=https://your-portal.trycloudflare.com
NEXT_PUBLIC_WEB_ADMIN_URL=https://your-admin.trycloudflare.com
RESET_PASSWORD_BASE_URL=https://your-admin.trycloudflare.com
CORS_ORIGIN=https://your-portal.trycloudflare.com,https://your-admin.trycloudflare.com
```

Giữ nguyên các URL service nội bộ:

```env
AUTH_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
ENROLLMENT_SERVICE_URL=http://localhost:3004
GRADE_SERVICE_URL=http://localhost:3005
```

Sau khi sửa `.env`, restart API Gateway, Web Portal và Web Admin. Nếu chạy bằng Docker, cần rebuild frontend vì `NEXT_PUBLIC_*` được Next.js nhúng lúc build:

```bash
docker compose up -d --build api-gateway web-portal web-admin
```

## F. Các lỗi thường gặp

Lỗi CORS:

- Kiểm tra `CORS_ORIGIN` đã chứa đúng link Web Portal và Web Admin tunnel chưa.
- Không thêm dấu `/` cuối URL nếu không cần.
- Restart API Gateway sau khi sửa `.env`.

Frontend vẫn gọi `localhost`:

- Kiểm tra `NEXT_PUBLIC_API_URL` đã đổi sang link API tunnel chưa.
- Restart Web Portal và Web Admin sau khi sửa `.env`.
- Nếu chạy Docker, rebuild Web Portal và Web Admin.

Tunnel bị đổi link sau khi tắt:

- Link miễn phí dạng `trycloudflare.com` có thể đổi mỗi lần chạy lại lệnh.
- Khi link đổi, cập nhật lại `.env` và restart các tiến trình liên quan.

Điện thoại truy cập được web nhưng không gọi được API:

- Kiểm tra tunnel API Gateway còn chạy không.
- Kiểm tra frontend đang dùng đúng `NEXT_PUBLIC_API_URL`.
- Kiểm tra `CORS_ORIGIN` có đúng link web đang mở trên điện thoại không.

Chưa restart frontend sau khi sửa `.env`:

- Next.js không luôn tự nhận lại biến môi trường public trong phiên đang chạy.
- Tắt và chạy lại `npm run dev`, hoặc rebuild container frontend nếu dùng Docker.

SQL Server hoặc Redis chưa chạy:

- Kiểm tra Docker Desktop đang chạy.
- Chạy lại `docker compose up -d mssql redis mssql-init`.
- Kiểm tra `DATABASE_URL` và `REDIS_URL` trong `.env`.

## G. Phương án demo khi bảo vệ

Laptop cá nhân chạy toàn bộ hệ thống gồm SQL Server, Redis, API Gateway, 5 microservices và 2 frontend. Khi demo, chỉ public 3 link HTTPS:

- Link Web Portal cho sinh viên
- Link Web Admin cho giảng viên, phòng đào tạo, admin
- Link API Gateway cho frontend gọi API

Không public database, Redis hoặc từng microservice. API Gateway là cửa vào duy nhất cho backend, còn các service nội bộ vẫn chạy trên laptop và chỉ được Gateway gọi.

Đây là phương án demo miễn phí, nhanh, phù hợp với dữ liệu SQL Server lớn và không yêu cầu thuê server cloud cấu hình cao trong giai đoạn bảo vệ khóa luận.
