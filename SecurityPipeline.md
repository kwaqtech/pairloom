Security Audit Pipeline
1. Security Scope & Asset Discovery
   
   Xác định tài sản cần bảo vệ, domain, subdomain, endpoint, API, tài khoản và vai trò người dùng.
   
   Đầu ra: Asset Inventory, Attack Surface Map
2. Threat Modeling & Security Requirements
   
   Phân tích dữ liệu nhạy cảm, luồng dữ liệu, trust boundaries, các kịch bản tấn công và yêu cầu bảo mật.
   
   Đầu ra: Threat Model, Security Requirements
3. Secret Scanning
   
   Tìm API Keys, database passwords, JWT secrets, OAuth credentials, private keys và credentials bị commit vào Git history.
   
   Đầu ra: Secrets Report
4. SCA – Software Composition Analysis
   
   Quét package, thư viện bên thứ ba, dependency trực tiếp và gián tiếp, CVE và giấy phép phần mềm.
   
   Đầu ra: Dependency Vulnerability Report
5. SAST – Static Application Security Testing
   
   Phân tích source code để tìm lỗ hổng tiềm ẩn mà không cần khởi chạy ứng dụng.
   
   Đầu ra: Source Code Security Report
6. Secure Code Review & Security Tests
   
   Review thủ công và chạy unit/integration tests cho Authentication, Authorization, Input Validation, Session, Error Handling, Logging.
   
   Đầu ra: Security Test Results, Code Review Findings
7. API Security Testing
   
   Kiểm tra endpoint, API authentication, object-level authorization, rate limits, mass assignment, SSRF và dữ liệu trả về.
   
   Đầu ra: API Security Report
8. IaC & Infrastructure Configuration Scanning
   
   Kiểm tra Docker, Terraform, Kubernetes, cloud configuration, firewall, IAM, database exposure và cấu hình server.
   
   Đầu ra: Infrastructure Misconfiguration Report
9. Container & Supply Chain Security
   
   Quét Docker image, base image, package hệ thống, SBOM, artifact integrity và cấu hình pipeline.
   
   Đầu ra: Container Vulnerability Report, SBOM
10. Security Functional & Integration Testing
    
    Kiểm thử các tình huống sử dụng và lạm dụng: vượt quyền, truy cập trái phép, upload file, reset mật khẩu, spam request, thao tác sai quy trình.
    
    Đầu ra: Security Regression Results
11. DAST – Dynamic Application Security Testing
    
    Chạy website trên Staging, crawl và kiểm tra các lỗi có thể phát hiện từ ứng dụng đang hoạt động.
    
    Đầu ra: Dynamic Scan Report
12. Manual Penetration Testing
    
    Mô phỏng hành vi attacker, kiểm tra các lỗi logic và trường hợp scanner tự động không phát hiện được.
    
    Đầu ra: Penetration Testing Report
13. TLS, HTTP Headers & Deployment Readiness
    
    Kiểm tra HTTPS, SSL/TLS, CSP, HSTS, CORS, cookie flags, cấu hình production, quyền truy cập và khả năng rollback.
    
    Đầu ra: Deployment Security Checklist
14. Remediation, Retesting & Release Gate
    
    Phân loại lỗi, khắc phục, quét lại, xác nhận kết quả và đưa ra quyết định Go/No-Go trước Production.
    
    Đầu ra: Final Security Audit Report
