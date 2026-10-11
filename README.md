# 🌐 Shadowing Language - Ứng Dụng Luyện Shadowing Đa Ngôn Ngữ

Ứng dụng web hỗ trợ luyện phát âm và phản xạ ngôn ngữ theo phương pháp **Shadowing** từ video YouTube, được thiết kế tối ưu công thái học (ergonomic) bám sát bản vẽ giao diện phác thảo.

---

## 🚀 Các Tính Năng Chính

### 1. Khu Vực Trên Cùng (Header & Điều Khiển)
- **Shadowing Language**: Chuyển đổi nhanh giữa 5 ngôn ngữ:
  - 🇬🇧 **Tiếng Anh** (English)
  - 🇨🇳 **Tiếng Trung** (中文)
  - 🇯🇵 **Tiếng Nhật** (日本語)
  - 🇰🇷 **Tiếng Hàn** (한국어)
  - 🇹🇭 **Tiếng Thái** (ไทย)
- **Input YouTube Link**: Nhập bất kỳ đường link YouTube (hỗ trợ link đầy đủ, link rút gọn `youtu.be`, `shorts`, `embed`), nút Dán nhanh từ clipboard và các video clip mẫu có sẵn cho từng ngôn ngữ để thử ngay chỉ bằng 1 cú click.
- **Thanh Cắt Phân Đoạn (Range Slicing & Loop)**:
  - Cho phép chọn thời lượng từ phút:giây đến phút:giây (ví dụ: từ `00:15` đến `01:15`).
  - Nút lấy mốc thời gian hiện tại (`Lấy mốc`).
  - Nút **Lặp đoạn clip** để tự động tua lại đoạn đã chọn khi hết mốc.

### 2. Khu Vực Ở Giữa (YouTube Player)
- Trình phát video YouTube trung tâm chất lượng cao, tỉ lệ chuẩn 16:9, giao diện tối bảo vệ mắt.
- Tích hợp YouTube IFrame Player API với động cơ đồng bộ thời gian thực 25fps (mili-giây) chính xác với phụ đề.
- Cơ chế bảo vệ: Video tự động tạm dừng chờ phụ đề và bản dịch tải xong trước khi phát.

### 3. Khu Vực Dưới Cùng (Song Song Song Ngữ & Công Thái Học)
- **Cột Phụ Đề Gốc (Bên trái)**:
  - Hiển thị phụ đề ngôn ngữ gốc chữ to, rõ nét (Hanzi thuần túy cho tiếng Trung, Kanji/Kana cho tiếng Nhật,...).
  - Không bị nhiễu phiên âm giúp rèn phản xạ phát âm và nhận diện mặt chữ tự nhiên.
  - **Luyện nghe mù (Blind Shadowing)**: Ẩn phụ đề để ép người học nghe bằng tai trước, nhấp chuột để kiểm tra chữ sau.
  - Điều hướng: Nút **Câu trước**, **Lặp lại câu** (Replay Sentence), **Câu sau**.
  - Nút **Lặp câu (Loop Sentence)**: Tự động lặp lại câu thoại liên tục cho đến khi nói chuẩn.
- **Cột Dịch Sang Tiếng Việt & Phiên Âm (Bên phải)**:
  - Bản dịch tiếng Việt tự động đồng bộ theo từng câu thoại theo thời gian thực.
  - Đối với tiếng Trung: Tự động tách và hiển thị phiên âm **Pinyin có dấu thanh điệu chuẩn xác** ở phần dịch, kèm nút Bật/Tắt Pinyin tiện dụng.
- **Thanh Điều Khiển Dưới Cùng**:
  - **Tốc độ phát âm**: Điều chỉnh linh hoạt `0.5x` | `0.75x` | `0.85x` | `1.0x` | `1.25x`.
  - **Chế độ Echo (Dừng sau mỗi câu)**: Video tự động tạm dừng khi kết thúc mỗi câu thoại để người học tự nhại lại, sau đó bấm phím cách (Space) để tiếp tục.

### 4. Tiện Ích Bổ Trợ
- **Toàn bộ kịch bản (Transcript Drawer)**: Xem danh sách toàn bộ câu thoại, tìm kiếm từ vựng, nhấp vào bất kỳ câu nào để nhảy video tới đó.
- **Tải phụ đề ngoài (Custom Subtitle)**: Hỗ trợ nạp tệp `.srt` hoặc `.vtt` khi video chưa có sẵn phụ đề tự động.
- **Phím tắt tiện dụng**:
  - `Space`: Phát / Tạm dừng
  - `R`: Lặp lại câu hiện tại
  - `←` / `→`: Câu trước / Câu sau
  - `L`: Bật / Tắt lặp lại câu hiện tại
  - `P`: Bật / Tắt chế độ Echo (tự dừng sau mỗi câu)
  - `B`: Bật / Tắt chế độ nghe mù (Blind Shadowing)
  - `[` / `]`: Giảm / Tăng tốc độ phát âm
  - `T`: Mở toàn bộ kịch bản

---

## 🛠️ Cài Đặt & Chạy Ứng Dụng

### Yêu Cầu
- Node.js (phiên bản 18+ hoặc 20+)
- npm hoặc pnpm / yarn

### Khởi Động Chế Độ Phát Triển (Fullstack Development):
```bash
npm run dev
```
Trang web sẽ chạy tại `http://localhost:5173` với Hot Reload và kết nối tự động đến Express API tại cổng `3001`.

### Chạy Bản Build Production:
```bash
# 1. Build giao diện frontend
npm run build

# 2. Khởi động server
npm start
```
Mở trình duyệt tại: **`http://localhost:3001`**
