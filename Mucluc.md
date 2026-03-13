# DÀN Ý CHI TIẾT KHÓA LUẬN TỐT NGHIỆP

**Đề tài:** Nghiên cứu và xây dựng hệ thống quản lý đào tạo dựa trên kiến trúc Microservices

---

## CHƯƠNG 1: TỔNG QUAN VỀ ĐỀ TÀI
### 1.1. Lý do chọn đề tài
- **1.1.1. Bối cảnh chuyển đổi số trong giáo dục đại học tại Việt Nam**: Phân tích nhu cầu cấp thiết về việc hiện đại hóa hạ tầng phần mềm trong các trường đại học.
- **1.1.2. Thách thức trong việc quản lý dữ liệu sinh viên quy mô lớn**: Vấn đề về lưu trữ, truy xuất và xử lý dữ liệu tập trung.
- **1.1.3. Hạn chế của kiến trúc Monolith**: 
    - Khó mở rộng (Difficult to Scale).
    - Rủi ro lỗi hệ thống (Single Point of Failure): Một lỗi nhỏ có thể làm sập toàn bộ hệ thống.
    - Khó khăn trong việc áp dụng công nghệ mới.
- **1.1.4. Tiềm năng của Microservices**: Giải quyết bài toán linh hoạt, cho phép triển khai độc lập và tối ưu hóa hiệu năng cho từng phân hệ.

### 1.2. Mục tiêu đề tài
- **1.2.1. Mục tiêu về công nghệ**: Làm chủ hệ sinh thái Node.js, NestJS, Prisma và kiến trúc Monorepo với Turborepo.
- **1.2.2. Mục tiêu về nghiệp vụ**: Xây dựng hệ thống quản lý toàn diện bao gồm: Hồ sơ sinh viên, Chương trình đào tạo, Đăng ký học phần, Quản lý điểm và Học phí.

### 1.3. Đối tượng và phạm vi nghiên cứu
- **1.3.1. Đối tượng**: Sinh viên, giảng viên và cán bộ quản lý đào tạo tại trường đại học.
- **1.3.2. Phạm vi**: Tập trung vào các nghiệp vụ lõi (Đăng ký học phần, quản lý điểm) và hạ tầng microservices.

### 1.4. Phương pháp nghiên cứu
- Nghiên cứu lý thuyết về kiến trúc phần mềm và hệ thống phân tán.
- Thực nghiệm xây dựng hệ thống dựa trên yêu cầu thực tế.

### 1.5. Cấu trúc đồ án (5 Chương)

---

## CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG
### 2.1. Kiến trúc Microservices
- **2.1.1. Khái niệm và 6 đặc trưng cốt lõi**: Decoupling, Business Capability, Componentization, Decentralized Governance, Continuous Delivery qua môi trường Container.
- **2.1.2. So sánh Microservices vs Monolith**: Bảng so sánh chi tiết về khả năng mở rộng, quy trình triển khai và độ phức tạp quản lý.
- **2.1.3. Các thách thức**: Độ trễ mạng, vấn đề nhất quán dữ liệu (Eventual Consistency) và bảo mật liên dịch vụ.

### 2.2. Nền tảng Node.js và NestJS Framework
- **2.2.1. Node.js**: Cơ chế Event Loop và Non-blocking I/O, sự phù hợp với các ứng dụng I/O Intensive.
- **2.2.2. NestJS Framework**: Tìm hiểu cấu trúc Module, Controller, Service và cơ chế Dependency Injection (DI).
- **2.2.3. Ưu điểm của NestJS trong Microservices (Nội dung chi tiết)**: 
    - **Kiến trúc Modular**: Giúp đóng gói logic nghiệp vụ và chia sẻ module dễ dàng.
    - **Transport Independence**: Tách biệt logic nghiệp vụ khỏi tầng giao tiếp (REST, gRPC, RabbitMQ...).
    - **Hỗ trợ Microservices sẵn có**: Sử dụng package `@nestjs/microservices` cho việc gọi inter-service.
    - **Bảo mật và Kiểm thử**: Tích hợp DI giúp dễ dàng Mocking và kiểm thử hệ thống.

### 2.3. Công nghệ lưu trữ và truy xuất dữ liệu
- **2.3.1. Hệ quản trị CSDL SQL Server**: Vai trò của SQL Server trong việc đảm bảo tính toàn vẹn dữ liệu doanh nghiệp.
- **2.3.2. Prisma ORM**: Cơ chế Type-safe, Schema Management và tính năng tự động sinh mã (Prisma Client).

### 2.4. Hạ tầng và Công cụ bổ trợ
- **2.4.1. API Gateway**: Đóng vai trò là cửa ngõ duy nhất, điều phối yêu cầu và bảo mật tập trung cho toàn bộ service phía sau.
- **2.4.2. Bảo mật**: Cơ chế JWT (JSON Web Token) kết hợp với chiến lược RBAC (Role-Based Access Control).
- **2.4.3. Quản lý Monorepo với Turborepo**: 
    - **Tối ưu tốc độ**: Sử dụng Remote Caching giúp tránh build lại các phần không thay đổi.
    - **Thực thi song song**: Chạy Build/Test đồng thời trên nhiều lõi CPU.
    - **Tiết kiệm thời gian**: Chỉ thực thi (Build/Lint/Test) trên những service có sự thay đổi (High-performance build system).
- **2.4.4. Docker**: Đóng gói ứng dụng thành các Container độc lập, giúp đồng bộ môi trường từ Development đến Production.

---

## CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
### 3.1. Phân tích yêu cầu hệ thống
- **3.1.1. Yêu cầu chức năng**: Nhóm quản lý hồ sơ, đào tạo, đăng ký tín chỉ và quản lý điểm/học phí.
- **3.1.2. Yêu cầu phi chức năng**: Tính sẵn sàng (Availability), Hiệu năng (Performance), Bảo mật (Security).

### 3.2. Thiết kế kiến trúc giải pháp
- **3.2.1. Sơ đồ kiến trúc tổng thể (High-level Architecture)**: Mô tả luồng từ Client qua Gateway đến các Microservices.
- **3.2.2. Chiến lược Database per Service**: 
    - Mỗi service sở hữu một schema riêng biệt, không truy cập trực tiếp dữ liệu của nhau.
    - Đảm bảo tính lỏng (Loose Coupling) và cho phép mỗi service mở rộng độc lập.
- **3.2.3. Thiết kế luồng giao tiếp Inter-service**: Sử dụng REST API và cơ chế gọi nội bộ giữa các service.

### 3.3. Thiết kế Cơ sở dữ liệu (Sơ đồ ERD chi tiết cho từng Service)
- **3.3.1. Service Identity (Auth)**: Lưu trữ User, Role, Permissions.
- **3.3.2. Service Student & Course**: Lưu trữ thông tin sinh viên, khoa, ngành và chương trình khung.
- **3.3.3. Service Grade & Enrollment**: Lưu trữ kết quả học tập, điểm danh và lịch sử đăng ký.

### 3.4. Thiết kế Use Case và Activity Diagram
- **3.4.1. Use Case tổng thể**.
- **3.4.2. Luồng nghiệp vụ Đăng ký học phần**: Mô tả chi tiết các bước xác thực, kiểm tra điều kiện môn học và cập nhật dữ liệu.

---

## CHƯƠNG 4: XÂY DỰNG VÀ CÀI ĐẶT HỆ THỐNG
### 4.1. Hiện thực hóa các Microservices cốt lõi
- **4.1.1. Auth-Service**: Hiện thực module Passport JWT, phân quyền dựa trên Metadata Decorators.
- **4.1.2. Student-Service**: Thực hiện các API CRUD hồ sơ, quản lý gia đình và thông tin học vấn.
- **4.1.3. Course-Service**: Xây dựng danh mục môn học, chương trình khung môn học.
- **4.1.4. Enrollment-Service**: Xử lý logic đăng ký (kiểm tra sĩ số, trùng lịch) và Transaction.
- **4.1.5. Grade-Service**: Hệ thống tính điểm, quản lý chuyên cần và kết quả rèn luyện.

### 4.2. Xây dựng Frontend Applications
- **4.2.1. Giao diện Cổng thông tin sinh viên (Web-Portal)**: Tra cứu điểm, đăng ký môn và xem công nợ.
- **4.2.2. Giao diện Quản trị (Web-Admin)**: Quản lý khoa, lớp, giảng viên và thiết lập cổng đăng ký.

### 4.3. Triển khai và Tích hợp
- **4.3.1. Cấu hình Docker Compose**: Thiết lập môi trường chạy đồng thời Database và các Apps.
- **4.3.2. Kiểm thử và Đánh giá**: Sử dụng Postman để kiểm chứng luồng nghiệp vụ liên dịch vụ.

---

## CHƯƠNG 5: ĐÁNH GIÁ VÀ KẾT LUẬN
### 5.1. Kết quả đạt được
- Đánh giá mức độ hoàn thiện so với 100% mục tiêu ban đầu.
- Phân tích hiệu năng phản hồi của các API chính.

### 5.2. Những đóng góp và bài học kinh nghiệm
- Xử lý bài toán nhất quán dữ liệu trong Microservices.
- Kinh nghiệm tổ chức mã nguồn Monorepo quy mô lớn.

### 5.3. Hạn chế và Hướng phát triển
- **Hạn chế**: Độ trễ mạng, sự phức tạp khi debug hệ thống phân tán.
- **Hướng phát triển**: CI/CD (GitHub Actions), Message Broker (RabbitMQ) và Giám sát hệ thống (Prometheus/Grafana).
