// --- App State & Auth Logic ---
const defaultSettings = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15
};

let appState = {
    users: {},
    currentUser: null
};

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('yksPomodoroState');
    if (saved) {
        appState = JSON.parse(saved);
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('yksPomodoroState', JSON.stringify(appState));
}

// UI Elements for Auth & Settings
const authModal = document.getElementById('auth-modal');
const mainApp = document.getElementById('main-app');
const userProfile = document.getElementById('user-profile');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');

// Auth Tabs Logic
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');

authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
    });
});

// Login Form
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!appState.users[username]) {
        loginError.innerText = "Kullanıcı bulunamadı.";
        return;
    }

    if (appState.users[username].password !== password) {
        loginError.innerText = "Hatalı şifre.";
        return;
    }

    // Success
    loginError.innerText = "";
    appState.currentUser = username;
    saveState();
    initializeApp();
});

// Register Form
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const registerSuccess = document.getElementById('register-success');

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;

    if (username.length < 3) {
        registerError.innerText = "Kullanıcı adı en az 3 karakter olmalıdır.";
        return;
    }

    if (appState.users[username]) {
        registerError.innerText = "Bu kullanıcı adı zaten alınmış.";
        return;
    }

    // Success - Create user and log them in
    appState.users[username] = {
        password: password,
        settings: { ...defaultSettings }
    };
    appState.currentUser = username;
    saveState();

    registerError.innerText = "";
    registerSuccess.innerText = "Kayıt başarılı! Giriş yapılıyor...";

    setTimeout(() => {
        initializeApp();
        registerForm.reset();
        registerSuccess.innerText = "";
    }, 1000);
});

// Logout
logoutBtn.addEventListener('click', () => {
    appState.currentUser = null;
    saveState();

    // Reset UI
    mainApp.classList.add('hidden');
    userProfile.classList.add('hidden');
    authModal.classList.remove('hidden');

    // Clear timer
    pauseTimer();
    loginForm.reset();
    document.title = "YKS Pomodoro & Sayaç";
});

// Settings Logic
const settingsForm = document.getElementById('settings-form');
const setPomodoro = document.getElementById('setting-pomodoro');
const setShortBreak = document.getElementById('setting-shortBreak');
const setLongBreak = document.getElementById('setting-longBreak');

settingsBtn.addEventListener('click', () => {
    // Populate current settings
    const settings = appState.users[appState.currentUser].settings;
    setPomodoro.value = settings.pomodoro;
    setShortBreak.value = settings.shortBreak;
    setLongBreak.value = settings.longBreak;

    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newSettings = {
        pomodoro: parseInt(setPomodoro.value),
        shortBreak: parseInt(setShortBreak.value),
        longBreak: parseInt(setLongBreak.value)
    };

    appState.users[appState.currentUser].settings = newSettings;
    saveState();

    settingsModal.classList.add('hidden');

    // Update active timer if it's not currently running to reflect new settings
    updateModesFromSettings();
    if (!isRunning) {
        resetTimer();
    }
});


// --- Countdown Timer Logic ---
// 2026 YKS typically happens in mid-June. Let's set it to June 20, 2026 at 10:15 AM
const targetDate = new Date('2026-06-20T10:15:00').getTime();

const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
        daysEl.innerText = "00";
        hoursEl.innerText = "00";
        minutesEl.innerText = "00";
        secondsEl.innerText = "00";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Format with leading zeros
    daysEl.innerText = days.toString().padStart(2, '0');
    hoursEl.innerText = hours.toString().padStart(2, '0');
    minutesEl.innerText = minutes.toString().padStart(2, '0');
    secondsEl.innerText = seconds.toString().padStart(2, '0');
}

// Update countdown every second
setInterval(updateCountdown, 1000);
updateCountdown();


// --- Pomodoro Logic ---
const timeDisplay = document.getElementById('time');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const modeBtns = document.querySelectorAll('.mode-btn');

let modes = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
};

function updateModesFromSettings() {
    if (!appState.currentUser) return;
    const settings = appState.users[appState.currentUser].settings;
    modes = {
        pomodoro: settings.pomodoro * 60,
        shortBreak: settings.shortBreak * 60,
        longBreak: settings.longBreak * 60
    };
}

let currentMode = 'pomodoro';
let timeLeft = modes[currentMode];
let timerInterval = null;
let isRunning = false;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timeDisplay.innerText = formatTime(timeLeft);
    document.title = `${formatTime(timeLeft)} - YKS Pomodoro`;
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.classList.add('disabled');
    pauseBtn.classList.remove('disabled');

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            // Play a sound or show notification here if needed
            alert("Süre doldu! Yeni otuma veya molaya geçebilirsin.");
            changeQuote(); // Change quote dynamically
            resetTimer();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    startBtn.classList.remove('disabled');
    pauseBtn.classList.add('disabled');
}

function resetTimer() {
    pauseTimer();
    timeLeft = modes[currentMode];
    updateTimerDisplay();
}

function switchMode(mode) {
    currentMode = mode;

    // Update active button styling
    modeBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');

    // Change accent color based on mode
    const root = document.documentElement;
    if (mode === 'pomodoro') {
        root.style.setProperty('--accent', '#818cf8');
        root.style.setProperty('--accent-hover', '#6366f1');
    } else if (mode === 'shortBreak') {
        root.style.setProperty('--accent', '#34d399');
        root.style.setProperty('--accent-hover', '#10b981');
    } else {
        root.style.setProperty('--accent', '#60a5fa');
        root.style.setProperty('--accent-hover', '#3b82f6');
    }

    resetTimer();
    changeQuote();
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        switchMode(e.target.getAttribute('data-mode'));
    });
});


// --- Motivational Quotes Logic ---
const quotes = [
    "Başarı, hazırlık ve fırsatın karşılaştığı yerdir.",
    "Hiçbir zafere çiçekli yollardan gidilmez.",
    "Gelecek, bugünden hazırlananlara aittir.",
    "Bugün yapacağın fedakarlıklar, yarın yaşayacağın rahatlığın bedelidir.",
    "Zorluklar, başarının değerini artıran süslerdir.",
    "Ertelenen her iş, omuzlarında biriken bir yüktür.",
    "Mazeret yok, sadece çalışmak var!",
    "Hedefine odaklan, gerisini unut.",
    "Çalıştığın her an seni hayallerine bir adım daha yaklaştırır.",
    "Başlamak için mükemmel olmak zorunda değilsin, ama mükemmel olmak için başlamalısın."
];

const quoteText = document.getElementById('quote-text');

function changeQuote() {
    // Fade out
    quoteText.style.opacity = 0;

    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        quoteText.innerText = quotes[randomIndex];
        // Fade in
        quoteText.style.opacity = 1;
    }, 500); // 500ms allows the CSS transition to work
}

// Change quote initially on load
changeQuote();
// Change quote every 15 minutes automatically based on interaction
setInterval(changeQuote, 15 * 60 * 1000);

// Bootstrap Application
function initializeApp() {
    if (appState.currentUser) {
        // User is logged in
        authModal.classList.add('hidden');
        mainApp.classList.remove('hidden');
        userProfile.classList.remove('hidden');
        usernameDisplay.innerText = appState.currentUser;

        updateModesFromSettings();
        switchMode('pomodoro'); // Reset to pomodoro on login
        changeQuote();
    } else {
        // Show login
        authModal.classList.remove('hidden');
        mainApp.classList.add('hidden');
        userProfile.classList.add('hidden');
    }
}

// Initial Load
loadState();
initializeApp();
