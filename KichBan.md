# Kịch bản bật hệ thống demo bảo vệ khóa luận

Tài liệu này dùng để thao tác trực tiếp trên laptop cá nhân khi bảo vệ khóa luận. Làm đúng thứ tự, không bỏ bước.

## 1. Mục tiêu demo

Laptop chạy toàn bộ hệ thống:

- SQL Server
- Redis
- API Gateway
- Auth Service
- Student Service
- Course Service
- Enrollment Service
- Grade Service
- Web Portal sinh viên
- Web Admin / giảng viên / phòng đào tạo

Chỉ public 3 link qua Cloudflare Tunnel:

- API Gateway
- Web Portal sinh viên
- Web Admin

Không public trực tiếp SQL Server, Redis hoặc từng microservice nội bộ.

Luồng đúng:

```text
Điện thoại / máy tính bảng / máy khác
-> Cloudflare Tunnel
-> Web Portal hoặc Web Admin
-> API Gateway
-> Microservices nội bộ
-> SQL Server / Redis trên laptop
```

## 2. Các cửa sổ cần mở khi bảo vệ

Chuẩn bị các cửa sổ sau:

1. Docker Desktop
2. PowerShell 1: chạy SQL Server, Redis và kiểm tra Docker
3. PowerShell 2: chạy `npm run dev`
4. PowerShell 3: tạo/lấy link Cloudflare Tunnel
5. VS Code: mở file `.env` và file hướng dẫn
6. Trình duyệt: mở Web Portal, Web Admin, API Gateway
7. Điện thoại hoặc máy tính bảng: mở link Web Portal / Web Admin public

Không dùng `cmd.exe` cho các lệnh có `Select-String`. Nếu đang ở `cmd.exe`, gõ:

```cmd
powershell
```

## 3. Bước 1 - Mở Docker Desktop

Mở Docker Desktop từ Start Menu.

Chờ đến khi Docker báo **Engine running**.

Trong PowerShell 1, chạy:

```powershell
docker info
```

Nếu lỗi, Docker chưa sẵn sàng. Chờ thêm rồi chạy lại.

## 4. Bước 2 - Vào đúng thư mục dự án

Trong PowerShell 1:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
```

Kiểm tra nhánh:

```powershell
git branch --show-current
```

Nhánh nên là:

```text
dev-minh
```

## 5. Bước 3 - Bật SQL Server và Redis

Trong PowerShell 1:

```powershell
docker compose up -d mssql redis mssql-init
```

Kiểm tra container:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Cần thấy:

```text
microservices_qlsv-mssql-1   Up ... healthy   1433->1433
microservices_qlsv-redis-1   Up ... healthy   6379->6379
```

Nếu `mssql-1` hoặc `redis-1` đang `Exited`, bấm nút Start trong Docker Desktop hoặc chạy lại:

```powershell
docker compose up -d mssql redis mssql-init
```

## 6. Bước 4 - Kiểm tra file `.env`

Mở file:

```text
D:\MyPepositoryGITHUB\MicroServices_QLSV\.env
```

Dòng database bắt buộc phải bắt đầu bằng `sqlserver://`:

```env
DATABASE_URL="sqlserver://localhost:1433;database=student_db;user=sa;password=Mdang2186;encrypt=DANGER_PLAINTEXT;trustServerCertificate=true;"
```

Các service nội bộ phải giữ `localhost`, không đổi sang link Cloudflare:

```env
AUTH_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
ENROLLMENT_SERVICE_URL=http://localhost:3004
GRADE_SERVICE_URL=http://localhost:3005
REDIS_URL=redis://localhost:6379
```

## 7. Bước 5 - Chạy toàn bộ hệ thống

Mở PowerShell 2:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
npm run dev
```

Giữ PowerShell 2 mở trong suốt quá trình demo.

Chờ log hiện các service đã start. Các port cần chạy:

| Thành phần | Port |
| --- | ---: |
| API Gateway | 3000 |
| Auth Service | 3001 |
| Student Service | 3002 |
| Course Service | 3003 |
| Enrollment Service | 3004 |
| Grade Service | 3005 |
| Web Portal sinh viên | 4000 |
| Web Admin | 4005 |

## 8. Bước 6 - Kiểm tra local trước

Mở trình duyệt trên laptop:

```text
http://localhost:3000/api-docs
http://localhost:4000/login
http://localhost:4005/login
```

Hoặc kiểm tra bằng PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:3000/api-docs -TimeoutSec 30 | Select-Object StatusCode
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:4000/login -TimeoutSec 30 | Select-Object StatusCode
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:4005/login -TimeoutSec 30 | Select-Object StatusCode
```

Kết quả đúng:

```text
StatusCode: 200
```

Nếu local chưa mở được, không mở Cloudflare vội. Phải sửa local trước.

## 9. Bước 7 - Tạo link Cloudflare Tunnel

Mở PowerShell 3:

```powershell
cd D:\MyPepositoryGITHUB\MicroServices_QLSV
```

Tạo link mới hoàn toàn:

```powershell
docker rm -f qlsv-cf-api qlsv-cf-portal qlsv-cf-admin

docker run -d --name qlsv-cf-api --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000
docker run -d --name qlsv-cf-portal --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4000
docker run -d --name qlsv-cf-admin --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4005
```

Nếu chỉ muốn bật lại container tunnel cũ:

```powershell
docker start qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
```

## 10. Bước 8 - Lấy 3 link tunnel mới

Trong PowerShell 3:

```powershell
docker logs qlsv-cf-api 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-portal 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
docker logs qlsv-cf-admin 2>&1 | Select-String -Pattern "https://[-a-zA-Z0-9]+\.trycloudflare\.com" | Select-Object -Last 1
```

Ghi lại đúng vai trò:

```text
API Gateway = link từ qlsv-cf-api
Web Portal  = link từ qlsv-cf-portal
Web Admin   = link từ qlsv-cf-admin
```

Nếu đang dùng `cmd.exe`, dùng:

```cmd
docker logs qlsv-cf-api 2>&1 | findstr trycloudflare.com
docker logs qlsv-cf-portal 2>&1 | findstr trycloudflare.com
docker logs qlsv-cf-admin 2>&1 | findstr trycloudflare.com
```

## 11. Bước 9 - Cập nhật `.env` theo link mới

Mở file `.env`.

Sửa đúng các dòng sau:

```env
NEXT_PUBLIC_API_URL=https://link-api-moi.trycloudflare.com
WEB_PORTAL_URL=https://link-portal-moi.trycloudflare.com
WEB_ADMIN_URL=https://link-admin-moi.trycloudflare.com
NEXT_PUBLIC_WEB_PORTAL_URL=https://link-portal-moi.trycloudflare.com
NEXT_PUBLIC_WEB_ADMIN_URL=https://link-admin-moi.trycloudflare.com
RESET_PASSWORD_BASE_URL=https://link-admin-moi.trycloudflare.com
CORS_ORIGIN=https://link-portal-moi.trycloudflare.com,https://link-admin-moi.trycloudflare.com
```

Ví dụ với link đang chạy hiện tại:

```env
NEXT_PUBLIC_API_URL=https://airlines-optimize-serial-copying.trycloudflare.com
WEB_PORTAL_URL=https://ways-element-comparison-scholarship.trycloudflare.com
WEB_ADMIN_URL=https://condition-generating-abstract-consortium.trycloudflare.com
NEXT_PUBLIC_WEB_PORTAL_URL=https://ways-element-comparison-scholarship.trycloudflare.com
NEXT_PUBLIC_WEB_ADMIN_URL=https://condition-generating-abstract-consortium.trycloudflare.com
RESET_PASSWORD_BASE_URL=https://condition-generating-abstract-consortium.trycloudflare.com
CORS_ORIGIN=https://ways-element-comparison-scholarship.trycloudflare.com,https://condition-generating-abstract-consortium.trycloudflare.com
```

## 12. Bước 10 - Restart hệ thống sau khi sửa `.env`

Quay lại PowerShell 2 đang chạy:

```text
npm run dev
```

Nhấn:

```text
Ctrl + C
```

Chạy lại:

```powershell
npm run dev
```

Bắt buộc restart sau khi sửa `.env`. Nếu không restart, frontend có thể vẫn gọi link cũ hoặc gọi `localhost`.

## 13. Bước 11 - Mở các tab trình duyệt để demo

Mở các tab trên laptop:

### Tab 1 - API Gateway

```text
https://link-api-moi.trycloudflare.com/api-docs
```

Ví dụ hiện tại:

```text
https://airlines-optimize-serial-copying.trycloudflare.com/api-docs
```

### Tab 2 - Web Portal sinh viên

```text
https://link-portal-moi.trycloudflare.com/login
```

Ví dụ hiện tại:

```text
https://ways-element-comparison-scholarship.trycloudflare.com/login
```

### Tab 3 - Web Admin

```text
https://link-admin-moi.trycloudflare.com/login
```

Ví dụ hiện tại:

```text
https://condition-generating-abstract-consortium.trycloudflare.com/login
```

### Tab 4 - Docker Desktop

Mở tab Containers để xem:

- `qlsv-cf-api`
- `qlsv-cf-portal`
- `qlsv-cf-admin`
- `microservices_qlsv-mssql-1`
- `microservices_qlsv-redis-1`

### Tab 5 - VS Code

Mở:

```text
.env
KichBan.md
CLOUDFLARE_TUNNEL_DEMO.md
```

## 14. Bước 12 - Mở trên điện thoại hoặc máy tính bảng

Trên điện thoại/máy tính bảng, mở:

```text
https://link-portal-moi.trycloudflare.com/login
https://link-admin-moi.trycloudflare.com/login
```

Nếu muốn quét nhanh, có thể tạo QR từ hai link này bằng trình duyệt hoặc công cụ tạo QR bất kỳ.

Không cần mở SQL Server, Redis, Auth Service, Student Service, Course Service, Enrollment Service, Grade Service trên điện thoại.

## 15. Tài khoản demo

### Web Admin - quản trị

```text
Email: admin@uneti.edu.vn
Mật khẩu: 123456
Vai trò: SUPER_ADMIN
```

### Web Admin - giảng viên

```text
Email: gv1@uneti.edu.vn
Mật khẩu: 123456
Vai trò: LECTURER
```

### Web Portal - sinh viên

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

## 16. Bước 13 - Kiểm tra dữ liệu qua link public

Chạy trong PowerShell 3:

```powershell
node -e "async function main(){const api='https://link-api-moi.trycloudflare.com'; const login=await fetch(api+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@uneti.edu.vn',password:'123456'})}); console.log('LOGIN', login.status); const data=await login.json(); console.log('ROLE', data.role, 'TOKEN', Boolean(data.accessToken)); const students=await fetch(api+'/api/students',{headers:{authorization:'Bearer '+data.accessToken}}); console.log('STUDENTS', students.status); const text=await students.text(); console.log(text.slice(0,300));} main().catch(err=>{console.error(err); process.exit(1);});"
```

Nhớ thay:

```text
https://link-api-moi.trycloudflare.com
```

bằng link API Gateway thật.

Ví dụ hiện tại:

```powershell
node -e "async function main(){const api='https://airlines-optimize-serial-copying.trycloudflare.com'; const login=await fetch(api+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@uneti.edu.vn',password:'123456'})}); console.log('LOGIN', login.status); const data=await login.json(); console.log('ROLE', data.role, 'TOKEN', Boolean(data.accessToken)); const students=await fetch(api+'/api/students',{headers:{authorization:'Bearer '+data.accessToken}}); console.log('STUDENTS', students.status); const text=await students.text(); console.log(text.slice(0,300));} main().catch(err=>{console.error(err); process.exit(1);});"
```

Kết quả đúng:

```text
LOGIN 201
ROLE SUPER_ADMIN TOKEN true
STUDENTS 200
```

## 17. Lỗi thường gặp và cách sửa nhanh

### Lỗi `DNS_PROBE_FINISHED_NXDOMAIN`

Nguyên nhân:

- Đang mở link tunnel cũ.
- Container tunnel đã bị xóa/tạo lại nên link đổi.

Cách sửa:

1. Lấy link mới bằng `docker logs`.
2. Sửa `.env`.
3. Restart `npm run dev`.
4. Mở lại link mới.

### Web mở được nhưng đăng nhập không được

Kiểm tra SQL Server và Redis:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Nếu SQL Server hoặc Redis đang dừng:

```powershell
docker compose up -d mssql redis mssql-init
```

### Web mở được nhưng không tải dữ liệu

Kiểm tra `.env`:

```env
NEXT_PUBLIC_API_URL=https://link-api-moi.trycloudflare.com
CORS_ORIGIN=https://link-portal-moi.trycloudflare.com,https://link-admin-moi.trycloudflare.com
```

Sau đó restart:

```powershell
npm run dev
```

### Lệnh `Select-String` bị lỗi

Bạn đang dùng `cmd.exe`.

Chuyển sang PowerShell:

```cmd
powershell
```

Hoặc dùng `findstr`:

```cmd
docker logs qlsv-cf-api 2>&1 | findstr trycloudflare.com
```

### Lỗi CORS

Sửa `.env`:

```env
CORS_ORIGIN=https://link-portal-moi.trycloudflare.com,https://link-admin-moi.trycloudflare.com
```

Restart:

```powershell
npm run dev
```

## 18. Cách tắt sau khi demo xong

Dừng app:

```text
Ctrl + C trong cửa sổ npm run dev
```

Dừng tunnel public:

```powershell
docker stop qlsv-cf-api qlsv-cf-portal qlsv-cf-admin
```

Dừng SQL Server và Redis nếu muốn:

```powershell
docker compose stop mssql redis
```

## 19. Câu nói ngắn khi trình bày kiến trúc demo

Có thể trình bày:

```text
Em không deploy database và microservices lên cloud vì dữ liệu SQL Server lớn.
Toàn bộ backend, SQL Server và Redis vẫn chạy trên laptop cá nhân.
Em chỉ public 3 thành phần bằng Cloudflare Tunnel: Web Portal, Web Admin và API Gateway.
Người dùng bên ngoài truy cập Web Portal hoặc Web Admin qua HTTPS, frontend gọi API Gateway qua link tunnel, sau đó API Gateway mới gọi các microservice nội bộ.
SQL Server, Redis và từng microservice không public trực tiếp ra Internet.
```

