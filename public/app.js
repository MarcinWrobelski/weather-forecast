let map;
let marker;
let currentLocation = null;

// Theme management
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    updateThemeIcon(theme);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (theme === 'dark') {
        themeIcon.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
    } else {
        themeIcon.setAttribute('d', 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z');
    }
}

// Initialize the map
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click event to map
    map.on('click', function (e) {
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker(e.latlng).addTo(map);
        currentLocation = e.latlng;
        fetchWeather(e.latlng.lat, e.latlng.lng);
    });

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setView(userLocation, 10);
            marker = L.marker(userLocation).addTo(map);
            currentLocation = userLocation;
            fetchWeather(userLocation.lat, userLocation.lng);
        });
    }
}

// Fetch weather data
async function fetchWeather(lat, lon) {
    const weatherInfo = document.getElementById('weatherInfo');
    weatherInfo.innerHTML = `
        <div class="loading bg-[#2a2a2a] p-4 rounded-lg h-32"></div>
    `;

    try {
        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        displayWeather(data);
    } catch (error) {
        console.error('Error fetching weather:', error);
        weatherInfo.innerHTML = `
            <div class="text-center text-white">
                Failed to fetch weather data. Please try again.
            </div>
        `;
    }
}

// Display weather information
function displayWeather(data) {
    const weatherInfo = document.getElementById('weatherInfo');
    const currentHour = new Date().getHours();

    const weatherHTML = `
        <div class="weather-card bg-[#2a2a2a] p-4 rounded-lg">
            <div class="text-center mb-4">
                <h3 class="text-xl font-semibold text-[#3d85c6]">Current Weather</h3>
                <div class="temperature text-4xl font-bold mt-2 text-white">${data.hourly.temperature_2m[currentHour]}°C</div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="weather-detail text-white">
                    <span>Humidity:</span>
                    <span class="font-semibold">${data.hourly.relativehumidity_2m[currentHour]}%</span>
                </div>
                <div class="weather-detail text-white">
                    <span>Precipitation:</span>
                    <span class="font-semibold">${data.hourly.precipitation_probability[currentHour]}%</span>
                </div>
            </div>
        </div>
        <div class="mt-4">
            <h4 class="text-lg font-semibold mb-2 text-[#3d85c6]">Daily Forecast</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${data.daily.time.map((date, index) => `
                    <div class="weather-card bg-[#2a2a2a] p-3 rounded-lg">
                        <div class="font-semibold text-white">${new Date(date).toLocaleDateString()}</div>
                        <div class="flex justify-between mt-2 text-white">
                            <span>Max: ${data.daily.temperature_2m_max[index]}°C</span>
                            <span>Min: ${data.daily.temperature_2m_min[index]}°C</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    weatherInfo.innerHTML = weatherHTML;
}

// Save location
document.getElementById('saveLocation').addEventListener('click', async () => {
    if (!currentLocation) return;

    const locationName = prompt('Enter a name for this location:');
    if (!locationName) return;

    try {
        const response = await fetch('/api/locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: locationName,
                latitude: currentLocation.lat,
                longitude: currentLocation.lng
            })
        });

        if (response.ok) {
            loadSavedLocations();
        }
    } catch (error) {
        console.error('Error saving location:', error);
    }
});

// Load saved locations
async function loadSavedLocations() {
    const savedLocations = document.getElementById('savedLocations');
    savedLocations.innerHTML = `
        <div class="loading bg-[#2a2a2a] p-4 rounded-lg h-24"></div>
    `;

    try {
        const response = await fetch('/api/locations');
        const locations = await response.json();

        savedLocations.innerHTML = locations.map(location => `
            <div class="location-card bg-[#2a2a2a] p-4 rounded-lg shadow hover:shadow-md" 
                 onclick="selectLocation(${location.latitude}, ${location.longitude})">
                <div class="font-semibold text-white">${location.name}</div>
                <div class="text-sm text-gray-300">
                    ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}
                </div>
                <button class="mt-2 text-[#3d85c6] text-sm hover:text-[#4a9ae0]"
                        onclick="deleteLocation(${location.id}, event)">
                    Delete
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading locations:', error);
        savedLocations.innerHTML = `
            <div class="text-center text-white">
                Failed to load saved locations. Please try again.
            </div>
        `;
    }
}

// Select saved location
function selectLocation(lat, lon) {
    if (marker) {
        map.removeLayer(marker);
    }
    marker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], 10);
    currentLocation = { lat, lng: lon };
    fetchWeather(lat, lon);
}

// Delete location
async function deleteLocation(id, event) {
    event.stopPropagation();
    try {
        const response = await fetch(`/api/locations/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            loadSavedLocations();
        }
    } catch (error) {
        console.error('Error deleting location:', error);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    initMap();
    loadSavedLocations();
}); 