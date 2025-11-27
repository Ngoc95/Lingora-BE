# Sử dụng Python 3.10
FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file thư viện vào
COPY requirements.txt .

# Cài đặt thư viện (Thêm --no-cache-dir để nhẹ máy)
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code vào
COPY . .

RUN python3 -m src.ingest

# Mở cổng 8000
EXPOSE 8000

# Lệnh chạy server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]