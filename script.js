// Cấu hình ban đầu
const EMPLOYEES = ["Lê Thị Thùy Trâm", "Phạm Thị Ngọc Hà", "Đặng Thị Bích Thảo", "Trương Trần Hoàng Lãm", "Nguyễn Thị Phương", "Ngô Thị Hoài Thương", "Phạm Thị Kiều My", "Thị Diều", "Y Sĩ YHCT Nguyễn Đức Phú", "BS YHCT Nguyễn Thùy Thúy Quỳnh"];
const START_HOUR = 7; 
const END_HOUR = 21;  
const ROW_HEIGHT = 50; 
const LOCAL_STORAGE_KEY = 'staff_bookings';
const CLOUD_COLLECTION = 'staff_bookings';

let bookings = [];
let useCloudSync = false;
let db = null;
let bookingsCollection = null;
let hasInitialCloudSync = false;

function setSyncStatus(message) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = message;
    }
}

function loadLocalBookings() {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
}

function saveLocalBookings() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookings));
}

function sortBookings(list) {
    return list.slice().sort((left, right) => {
        if (left.start !== right.start) return left.start - right.start;
        if (left.employee !== right.employee) return left.employee.localeCompare(right.employee, 'vi');
        return (left.note || '').localeCompare(right.note || '', 'vi');
    });
}

async function initCloudSync() {
    const firebaseConfig = window.FIREBASE_CONFIG;
    if (!firebaseConfig || !firebaseConfig.projectId || !window.firebase) {
        bookings = sortBookings(loadLocalBookings());
        setSyncStatus('Đang dùng lưu cục bộ trên trình duyệt');
        renderGrid();
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        db = firebase.firestore();
        bookingsCollection = db.collection(CLOUD_COLLECTION);
        useCloudSync = true;
        setSyncStatus('Đang đồng bộ chung cho nhiều người dùng');

        bookingsCollection.onSnapshot((snapshot) => {
            bookings = sortBookings(snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })));
            hasInitialCloudSync = true;
            renderGrid();
            setSyncStatus('Đang đồng bộ chung cho nhiều người dùng');
        }, (error) => {
            console.error('Cloud sync error', error);
            useCloudSync = false;
            bookings = sortBookings(loadLocalBookings());
            setSyncStatus('Đồng bộ thất bại, đang dùng lưu cục bộ');
            renderGrid();
        });
    } catch (error) {
        console.error('Init cloud sync error', error);
        useCloudSync = false;
        bookings = sortBookings(loadLocalBookings());
        setSyncStatus('Đồng bộ chưa bật, đang dùng lưu cục bộ');
        renderGrid();
    }
}

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
        eventEl.dataset.bookingId = booking.id || '';

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

    const newBooking = { employee, start, end, note, createdAt: Date.now() };

    if (useCloudSync && bookingsCollection) {
        bookingsCollection.add(newBooking).then(() => {
            document.getElementById('noteInput').value = '';
        }).catch((error) => {
            console.error('Add cloud booking failed', error);
            bookings.push({ ...newBooking, id: `local-${Date.now()}` });
            bookings = sortBookings(bookings);
            saveLocalBookings();
            document.getElementById('noteInput').value = '';
            renderGrid();
        });
        return;
    }

    bookings.push({ ...newBooking, id: `local-${Date.now()}` });
    bookings = sortBookings(bookings);
    saveLocalBookings();

    document.getElementById('noteInput').value = '';
    renderGrid();
}

// 5. Xóa 1 lịch cụ thể
function deleteBooking(index) {
    if(confirm("Bạn muốn xóa ghi chú bận này?")) {
        const booking = bookings[index];

        if (useCloudSync && bookingsCollection && booking && booking.id) {
            bookingsCollection.doc(booking.id).delete().catch((error) => {
                console.error('Delete cloud booking failed', error);
            });
            return;
        }

        bookings.splice(index, 1);
        saveLocalBookings();
        renderGrid();
    }
}

// 6. Xóa sạch lịch
function clearAllBookings() {
    if (confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch ghi nhớ không?")) {
        if (useCloudSync && bookingsCollection) {
            bookingsCollection.get().then((snapshot) => {
                const batch = db.batch();
                snapshot.forEach((doc) => batch.delete(doc.ref));
                return batch.commit();
            }).catch((error) => {
                console.error('Clear cloud bookings failed', error);
            });
            return;
        }

        bookings = [];
        localStorage.removeItem('staff_bookings');
        renderGrid();
    }
}

// Chạy ứng dụng khi load trang
initForm();
initCloudSync();