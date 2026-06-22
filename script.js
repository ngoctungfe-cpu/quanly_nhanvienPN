// Cấu hình ban đầu
const EMPLOYEES = ["Lê Thị Thùy Trâm", "Phạm Thị Ngọc Hà", "Đặng Thị Bích Thảo", "Trương Trần Hoàng Lãm", "Nguyễn Thị Phương", "Ngô Thị Hoài Thương", "Phạm Thị Kiều My", "Thị Diều", "Y Sĩ YHCT Nguyễn Đức Phú", "BS YHCT Nguyễn Thùy Thúy Quỳnh"];
const START_HOUR = 7; 
const END_HOUR = 21;  
const ROW_HEIGHT = 50; 

// Lấy dữ liệu cũ từ LocalStorage
let bookings = JSON.parse(localStorage.getItem('staff_bookings')) || [];

// 1. Khởi tạo dữ liệu cho các ô Chọn nhân viên và giờ giấc
function initForm() {
    const empSelect = document.getElementById('employeeSelect');
    EMPLOYEES.forEach(emp => {
        empSelect.innerHTML += `<option value="${emp}">${emp}</option>`;
    });

    const startSelect = document.getElementById('startTime');
    const endSelect = document.getElementById('endTime');
    for(let i = START_HOUR; i <= END_HOUR; i++) {
        startSelect.innerHTML += `<option value="${i}">${i}:00</option>`;
        endSelect.innerHTML += `<option value="${i}">${i}:00</option>`;
    }
    endSelect.value = START_HOUR + 1; 
}

// 2. Vẽ bảng lịch GRID
function renderGrid() {
    const grid = document.getElementById('schedulerGrid');
    grid.innerHTML = ''; 

    grid.innerHTML += `<div class="grid-header">Giờ</div>`;
    EMPLOYEES.forEach(emp => {
        grid.innerHTML += `<div class="grid-header">${emp}</div>`;
    });

    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        grid.innerHTML += `<div class="time-cell">${hour}:00</div>`;
        for (let empIdx = 0; empIdx < EMPLOYEES.length; empIdx++) {
            grid.innerHTML += `<div class="slot-cell grid-row-line" data-hour="${hour}" data-emp="${EMPLOYEES[empIdx]}"></div>`;
        }
    }

    renderEvents();
}

// 3. Vẽ các block bận đè lên lịch
function renderEvents() {
    bookings.forEach((booking, index) => {
        const empColIndex = EMPLOYEES.indexOf(booking.employee);
        if (empColIndex === -1) return;

        const startRow = booking.start - START_HOUR;
        const duration = booking.end - booking.start;

        if (startRow < 0 || duration <= 0) return;

        const eventEl = document.createElement('div');
        eventEl.className = 'event-block';
        
        const topPosition = 54 + (startRow * ROW_HEIGHT); 
        const heightPosition = (duration * ROW_HEIGHT) - 8; 

        eventEl.style.top = `${topPosition}px`;
        eventEl.style.gridColumn = `${empColIndex + 2}`; 
        eventEl.style.height = `${heightPosition}px`;

        eventEl.innerHTML = `
            <div>
                <div class="time-label">${booking.start}h - ${booking.end}h</div>
                <strong>BẬN:</strong> ${booking.note || 'Có lịch'}
            </div>
            <span class="delete-btn" onclick="deleteBooking(${index})">×</span>
        `;

        document.getElementById('schedulerGrid').appendChild(eventEl);
    });
}

// 4. Hàm thêm lịch bận
function addBooking() {
    const employee = document.getElementById('employeeSelect').value;
    const start = parseInt(document.getElementById('startTime').value);
    const end = parseInt(document.getElementById('endTime').value);
    const note = document.getElementById('noteInput').value.trim();

    if (start >= end) {
        alert("Giờ kết thúc phải lớn hơn giờ bắt đầu!");
        return;
    }

    const isOverlap = bookings.some(b => 
        b.employee === employee && 
        ((start < b.end && end > b.start))
    );

    if (isOverlap) {
        alert(`⚠️ Thao tác lỗi: ${employee} đã có lịch bận trong khoảng từ ${start}h đến ${end}h rồi!`);
        return;
    }

    bookings.push({ employee, start, end, note });
    localStorage.setItem('staff_bookings', JSON.stringify(bookings));

    document.getElementById('noteInput').value = '';
    renderGrid();
}

// 5. Xóa 1 lịch cụ thể
function deleteBooking(index) {
    if(confirm("Bạn muốn xóa ghi chú bận này?")) {
        bookings.splice(index, 1);
        localStorage.setItem('staff_bookings', JSON.stringify(bookings));
        renderGrid();
    }
}

// 6. Xóa sạch lịch
function clearAllBookings() {
    if (confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch ghi nhớ không?")) {
        bookings = [];
        localStorage.removeItem('staff_bookings');
        renderGrid();
    }
}

// Chạy ứng dụng khi load trang
initForm();
renderGrid();