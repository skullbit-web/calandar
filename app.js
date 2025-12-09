// 🚨 IMPORTANT: Replace with your actual Supabase URL and Public Key
const SUPABASE_URL = 'https://shlsaexhidyutqtdbowa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobHNhZXhoaWR5dXRxdGRib3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDUzODgsImV4cCI6MjA4MDg4MTM4OH0.2sjUQSY4mJBb_2NKXNziAHw5vPNcxEv3WsF8Fz7dIak';

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- State Variables ---
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let eventsData = []; // Cache for all fetched events

// --- DOM Elements ---
const calendarGrid = document.getElementById('calendar-grid');
const monthYearDisplay = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;
const modal = document.getElementById('event-modal');
const closeButton = document.querySelector('.close-button');
const eventDateInput = document.getElementById('event-date');
const eventTitleInput = document.getElementById('event-title');
const saveEventBtn = document.getElementById('save-event-button');
let modalIsVisible = false;

// --- Event Handlers ---
prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));
themeToggleBtn.addEventListener('click', toggleTheme);
closeButton.addEventListener('click', () => toggleModal(false));
saveEventBtn.addEventListener('click', saveEvent);

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        toggleModal(false);
    }
});

// --- Supabase Functions ---

// 🚨 WARNING: In a production app, this must be replaced by a proper sign-in flow.
// This uses a fixed ID ('anon_user') to demonstrate persistence.
const USER_ID = 'anon_user_12345'; 

async function fetchEvents() {
    // 1. Define the start and end of the current viewing month for filtering
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    // Get the last day of the month by going to the 0th day of the next month
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    
    // 2. Query Supabase for events in the current month for the current user
    const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, date')
        .eq('user_id', USER_ID) 
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

    if (error) {
        console.error('Error fetching events. Check your API keys and table name:', error);
        // Fallback to empty array if fetch fails
        eventsData = []; 
    } else {
        eventsData = data || [];
    }
    // Always re-render after fetching data
    renderCalendar();
}

async function saveEvent() {
    const title = eventTitleInput.value.trim();
    const date = eventDateInput.value;

    if (!title || !date) {
        // Use a simple console message instead of alert()
        console.warn('Event title and date are required.');
        return;
    }

    const { error } = await supabase
        .from('calendar_events')
        .insert([
            { title: title, date: date, user_id: USER_ID }
        ]);

    if (error) {
        console.error('Failed to save event:', error);
    } else {
        // Success: Close modal, clear inputs, and refresh data
        toggleModal(false);
        eventTitleInput.value = '';
        fetchEvents(); 
    }
}

// --- UI Logic Functions ---

function toggleModal(show, dateString = null) {
    if (show) {
        eventDateInput.value = dateString || new Date().toISOString().split('T')[0];
        eventTitleInput.value = '';
        modal.style.display = 'flex';
        modalIsVisible = true;
    } else {
        modal.style.display = 'none';
        modalIsVisible = false;
    }
}

function toggleTheme() {
    const isDark = body.classList.toggle('dark-mode');
    // Save preference to Local Storage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggleBtn.textContent = isDark ? ' 🌙' : ' ☀️';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleBtn.textContent = ' 🌙';
    } else {
        body.classList.remove('dark-mode');
        themeToggleBtn.textContent = ' ☀️';
    }
}

function renderCalendar() {
    calendarGrid.innerHTML = ''; // Clear previous grid
    
    const today = new Date();
    const date = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);
    const lastDayIndex = lastDay.getDay();
    const nextDays = (7 - lastDayIndex - 1) % 7; // Ensure we fill a full grid line

    // Display current month and year
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Previous Month's Days
    for (let x = date.getDay(); x > 0; x--) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell', 'prev-next-month');
        
        const dayNumber = document.createElement('span');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = prevLastDay.getDate() - x + 1;
        dayCell.appendChild(dayNumber);
        
        calendarGrid.appendChild(dayCell);
    }

    // Current Month's Days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');
        
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Day Number Span
        const dayNumber = document.createElement('span');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = i;
        
        // Highlight Current Day (The blue/red circle)
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayNumber.classList.add('current-day-circle');
        }

        // Add Event Marker if event exists for this day
        const hasEvent = eventsData.some(event => {
            // Compare only the YYYY-MM-DD part
            return event.date === dateString; 
        });
        
        dayCell.appendChild(dayNumber);

        if (hasEvent) {
            const eventMarker = document.createElement('div');
            eventMarker.classList.add('event-marker');
            dayCell.appendChild(eventMarker);
        }

        // Event listener to open modal and set date
        dayCell.addEventListener('click', () => toggleModal(true, dateString));
        
        calendarGrid.appendChild(dayCell);
    }

    // Next Month's Days
    for (let j = 1; j <= nextDays; j++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell', 'prev-next-month');
        
        const dayNumber = document.createElement('span');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = j;
        dayCell.appendChild(dayNumber);
        
        calendarGrid.appendChild(dayCell);
    }
}

function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    // Fetch new events for the new month, which calls renderCalendar()
    fetchEvents();
}

// --- Initialization ---

function init() {
    loadTheme();
    // Start by fetching data for the current month
    fetchEvents(); 
}

init();

// Simple sign-in check
async function signInAnon() {
    console.log("Supabase initialized. Data is stored under fixed user ID: " + USER_ID);
}

signInAnon();
