
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusText = document.getElementById("status");
const weatherContent = document.getElementById("weather-content");

const weatherTypes = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Moderate drizzle", "🌦️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Light freezing drizzle", "🌧️"],
    57: ["Dense freezing drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Moderate rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Light freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Light snowfall", "🌨️"],
    73: ["Moderate snowfall", "🌨️"],
    75: ["Heavy snowfall", "❄️"],
    77: ["Snow grains", "❄️"],
    80: ["Light rain showers", "🌦️"],
    81: ["Moderate rain showers", "🌧️"],
    82: ["Violent rain showers", "⛈️"],
    85: ["Light snow showers", "🌨️"],
    86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Severe thunderstorm with hail", "⛈️"]
};

function getWeather(code) {
    return weatherTypes[code] || ["Unknown conditions", "🌡️"];
}

function formatDay(dateString) {
    return new Date(dateString + "T12:00:00").toLocaleDateString(
        "en",
        { weekday: "short" }
    );
}

function formatHour(dateString) {
    return new Date(dateString).toLocaleTimeString("en", {
        hour: "numeric"
    });
}

async function loadWeather(city) {
    statusText.hidden = false;
    statusText.textContent = "Loading weather...";
    weatherContent.hidden = true;

    try {
        // Find the city's coordinates
        const geoUrl =
            "https://geocoding-api.open-meteo.com/v1/search?name=" +
            encodeURIComponent(city) +
            "&count=1&language=en&format=json";

        const geoResponse = await fetch(geoUrl);

        if (!geoResponse.ok) {
            throw new Error("Could not search for this city.");
        }

        const geoData = await geoResponse.json();
        const place = geoData.results?.[0];

        if (!place) {
            throw new Error("City not found. Try another city name.");
        }

        // Get current, hourly and 7-day forecast
        const params = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "wind_speed_10m"
            ].join(","),
            hourly: [
                "temperature_2m",
                "precipitation_probability",
                "weather_code"
            ].join(","),
            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max"
            ].join(","),
            timezone: "auto",
            forecast_days: "7"
        });

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params}`
        );

        if (!response.ok) {
            throw new Error("Weather data is unavailable right now.");
        }

        const data = await response.json();

        displayWeather(place, data);

        statusText.hidden = true;
        weatherContent.hidden = false;
    } catch (error) {
        statusText.textContent =
            error.message || "Something went wrong. Please try again.";
    }
}

function displayWeather(place, data) {
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    const [description, icon] = getWeather(current.weather_code);

    document.getElementById("city-name").textContent =
        `${place.name}, ${place.country}`;

    document.getElementById("current-date").textContent =
        new Date().toLocaleDateString("en", {
            weekday: "long",
            month: "long",
            day: "numeric"
        });

    document.getElementById("weather-icon").textContent =
        current.is_day ? icon : (current.weather_code === 0 ? "🌙" : icon);

    document.getElementById("condition").textContent = description;

    document.getElementById("temperature").textContent =
        Math.round(current.temperature_2m);

    document.getElementById("feels-like").textContent =
        `Feels like ${Math.round(current.apparent_temperature)}°C`;

    document.getElementById("humidity").textContent =
        `${current.relative_humidity_2m}%`;

    document.getElementById("wind").textContent =
        `${Math.round(current.wind_speed_10m)} km/h`;

    // Use the nearest available hourly forecast for rain probability
    const now = new Date();
    let hourIndex = hourly.time.findIndex(
        time => new Date(time) >= now
    );

    if (hourIndex === -1) hourIndex = 0;

    document.getElementById("rain").textContent =
        `${hourly.precipitation_probability[hourIndex] ?? 0}%`;

    // Show the next 6 hourly forecasts
    const hourlyList = document.getElementById("hourly-forecast");
    hourlyList.innerHTML = "";

    for (let i = hourIndex; i < Math.min(hourIndex + 6, hourly.time.length); i++) {
        const [hourDescription, hourIcon] =
            getWeather(hourly.weather_code[i]);

        const card = document.createElement("div");
        card.className = "hour-card";

        const time = document.createElement("span");
        time.textContent = formatHour(hourly.time[i]);

        const iconElement = document.createElement("span");
        iconElement.className = "hour-icon";
        iconElement.textContent = hourIcon;

        const temp = document.createElement("strong");
        temp.textContent = `${Math.round(hourly.temperature_2m[i])}°C`;

        const chance = document.createElement("span");
        chance.textContent =
            `${hourly.precipitation_probability[i] ?? 0}% rain`;

        chance.title = hourDescription;

        card.append(time, iconElement, temp, chance);
        hourlyList.appendChild(card);
    }

    // Show the 7-day forecast
    const dailyList = document.getElementById("daily-forecast");
    dailyList.innerHTML = "";

    daily.time.forEach((date, index) => {
        const [dayDescription, dayIcon] =
            getWeather(daily.weather_code[index]);

        const row = document.createElement("div");
        row.className = "daily-row";

        const day = document.createElement("strong");
        day.textContent = index === 0 ? "Today" : formatDay(date);

        const iconElement = document.createElement("span");
        iconElement.className = "daily-icon";
        iconElement.textContent = dayIcon;
        iconElement.title = dayDescription;

        const temps = document.createElement("strong");
        temps.textContent =
            `${Math.round(daily.temperature_2m_min[index])}° / ` +
            `${Math.round(daily.temperature_2m_max[index])}°`;

        const rain = document.createElement("span");
        rain.className = "daily-rain";
        rain.textContent =
            `🌧 ${daily.precipitation_probability_max[index] ?? 0}%`;

        row.append(day, iconElement, temps, rain);
        dailyList.appendChild(row);
    });
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (city) {
        loadWeather(city);
    }
});

// Load an initial city when the app opens
cityInput.value = "Harare";
loadWeather("Harare");

