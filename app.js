// Data model - structured to support multiple periods
let locationPeriods = [];

// Configuration
const MIN_YEAR = 1970;

// Cloud cover categories (percentage thresholds)
const CLOUD_CATEGORIES = {
    CLEAR: 15,           // 0-15% = Cloud-free
    PARTLY_CLOUDY: 50,   // 16-50% = Partly cloudy
    MOSTLY_CLOUDY: 85,   // 51-85% = Mostly cloudy
    OVERCAST: 100        // 86-100% = Totally cloudy/overcast
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    attachEventListeners();
    startTitleAnimation();
});

// Title animation
function startTitleAnimation() {
    const words = ['Cloudy', 'Perfect', 'Sunny', 'Rainy', 'Better', 'Gloomy', 'Bright', 'Dreary', 'Golden', 'Gray', 'Happy', 'Stormy'];
    let currentIndex = 0;
    const wordElement = document.getElementById('animatedWord');
    
    if (!wordElement) return;
    
    function cycleWord() {
        // Fade out
        wordElement.classList.add('faded');
        
        setTimeout(() => {
            // Change word
            currentIndex = (currentIndex + 1) % words.length;
            wordElement.textContent = words[currentIndex];
            
            // Fade in (remove faded class only if it's "Cloudy")
            if (words[currentIndex] === 'Cloudy') {
                wordElement.classList.remove('faded');
            }
        }, 300); // Fade transition time
        
        // Schedule next cycle - longer delay for "Cloudy"
        const nextDelay = words[currentIndex] === 'Cloudy' ? 2000 : 1000;
        setTimeout(cycleWord, nextDelay);
    }
    
    // Start the animation
    setTimeout(cycleWord, 2000); // Initial delay before first change
}

function initializeForm() {
    // Add the first period by default
    addPeriod();
}

function attachEventListeners() {
    const form = document.getElementById('cloudyForm');
    const addPeriodBtn = document.getElementById('addPeriodBtn');

    form.addEventListener('submit', handleSubmit);
    addPeriodBtn.addEventListener('click', () => addPeriod());
}

function addPeriod() {
    const container = document.getElementById('periodsContainer');
    const periodIndex = locationPeriods.length;
    
    // Check if the previous location's end date is still set to today
    if (locationPeriods.length > 0) {
        const lastPeriod = locationPeriods[locationPeriods.length - 1];
        const lastEndDateInput = document.getElementById(`endDate-${lastPeriod.id}`);
        const today = getTodayDate();
        
        if (lastEndDateInput && lastEndDateInput.value === today) {
            // Highlight the field and show a message
            lastEndDateInput.classList.add('needs-attention');
            
            // Show a helpful message
            const lastPeriodElement = document.querySelector(`[data-period-id="${lastPeriod.id}"]`);
            let warningDiv = lastPeriodElement.querySelector('.date-warning');
            
            if (!warningDiv) {
                warningDiv = document.createElement('div');
                warningDiv.className = 'date-warning';
                warningDiv.innerHTML = '⚠️ Please set an end date for this location before adding another';
                lastPeriodElement.appendChild(warningDiv);
            }
            
            // Scroll to the field
            lastEndDateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastEndDateInput.focus();
            
            return; // Don't add a new period yet
        }
    }
    
    // Determine default start date for new location
    let defaultStartDate = '';
    if (locationPeriods.length > 0) {
        // Get the last period's end date
        const lastPeriod = locationPeriods[locationPeriods.length - 1];
        const lastEndDateInput = document.getElementById(`endDate-${lastPeriod.id}`);
        
        if (lastEndDateInput && lastEndDateInput.value) {
            // Add one day to the previous end date
            const lastEndDate = new Date(lastEndDateInput.value);
            lastEndDate.setDate(lastEndDate.getDate() + 1);
            defaultStartDate = lastEndDate.toISOString().split('T')[0];
        }
    }
    
    // Create period data
    const period = {
        id: Date.now() + periodIndex,
        startDate: defaultStartDate,
        endDate: getTodayDate(),
        location: ''
    };
    
    locationPeriods.push(period);

    // Create period HTML
    const periodElement = createPeriodElement(period, periodIndex);
    container.appendChild(periodElement);

    // Show "Add Another Location" button
    document.getElementById('addPeriodBtn').style.display = 'block';
    
    // Hide the CTA only when adding the second+ location - user clearly understood
    if (locationPeriods.length > 1) {
        hideAddLocationCTA();
    }
}

function createPeriodElement(period, index) {
    const div = document.createElement('div');
    div.className = 'period';
    div.dataset.periodId = period.id;

    const showRemoveButton = locationPeriods.length > 1;
    const isFirstPeriod = index === 0;

    div.innerHTML = `
        <div class="period-header">
            <h3>Location ${index + 1}</h3>
            ${showRemoveButton ? `<button type="button" class="remove-period" onclick="removePeriod(${period.id})">×</button>` : ''}
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="startDate-${period.id}">Start Date</label>
                <input 
                    type="date" 
                    id="startDate-${period.id}" 
                    name="startDate" 
                    required 
                    min="1970-01-01" 
                    max="${getTodayDate()}"
                    value="${period.startDate}"
                >
                <span class="helper-text">${isFirstPeriod ? 'From 1970 onwards' : 'When you moved here'}</span>
            </div>
            
            <div class="form-group">
                <label for="endDate-${period.id}">End Date</label>
                <input 
                    type="date" 
                    id="endDate-${period.id}" 
                    name="endDate" 
                    required 
                    min="1970-01-01" 
                    max="${getTodayDate()}"
                    value="${period.endDate}"
                    onchange="clearDateWarning(${period.id})"
                >
                <span class="helper-text">${isFirstPeriod ? 'Defaults to today' : 'When you left'}</span>
            </div>
        </div>

        <div class="form-group full-width">
            <label for="location-${period.id}">Location</label>
            <input 
                type="text" 
                id="location-${period.id}" 
                name="location" 
                placeholder="e.g., London, Tokyo, New York" 
                required
                value="${period.location}"
                autocomplete="off"
                oninput="handleLocationInput(${period.id})"
            >
            <div id="location-suggestions-${period.id}" class="location-suggestions"></div>
            <input type="hidden" id="location-coords-${period.id}" value="">
            <span class="helper-text">Start typing to see location suggestions</span>
        </div>
        
        ${isFirstPeriod && locationPeriods.length === 1 ? `
        <div class="add-location-cta">
            <p>🌍 Lived in multiple cities? Add them to see your complete weather story!</p>
        </div>
        ` : ''}
    `;

    return div;
}

function removePeriod(periodId) {
    const index = locationPeriods.findIndex(p => p.id === periodId);
    if (index > -1 && locationPeriods.length > 1) {
        locationPeriods.splice(index, 1);
        
        const element = document.querySelector(`[data-period-id="${periodId}"]`);
        element.remove();

        // Re-render to update numbering and CTA
        rerenderPeriods();
        
        // Show CTA again if back to one location
        if (locationPeriods.length === 1) {
            const cta = document.querySelector('.add-location-cta');
            if (cta) {
                cta.style.display = 'block';
            }
        }
    }
}

function updateAddLocationCTA() {
    const addBtn = document.getElementById('addPeriodBtn');
    if (locationPeriods.length === 1) {
        addBtn.innerHTML = '➕ Add Another Location';
        addBtn.style.display = 'block';
    } else {
        addBtn.innerHTML = '➕ Add Another Location';
    }
}

function hideAddLocationCTA() {
    // Remove CTA from the first period if it exists
    const cta = document.querySelector('.add-location-cta');
    if (cta) {
        cta.style.display = 'none';
    }
}

function clearDateWarning(periodId) {
    const periodElement = document.querySelector(`[data-period-id="${periodId}"]`);
    const endDateInput = document.getElementById(`endDate-${periodId}`);
    const warningDiv = periodElement.querySelector('.date-warning');
    
    if (endDateInput) {
        endDateInput.classList.remove('needs-attention');
    }
    
    if (warningDiv) {
        warningDiv.remove();
    }
}

// Location autocomplete functionality
let locationSearchTimeout = null;

async function handleLocationInput(periodId) {
    const input = document.getElementById(`location-${periodId}`);
    const suggestionsDiv = document.getElementById(`location-suggestions-${periodId}`);
    const coordsInput = document.getElementById(`location-coords-${periodId}`);
    
    const query = input.value.trim();
    
    // Clear previous timeout
    if (locationSearchTimeout) {
        clearTimeout(locationSearchTimeout);
    }
    
    // Clear coords when typing
    coordsInput.value = '';
    
    if (query.length < 2) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    // Debounce search
    locationSearchTimeout = setTimeout(async () => {
        try {
            const results = await searchLocations(query);
            displayLocationSuggestions(periodId, results);
        } catch (error) {
            console.error('Location search error:', error);
            suggestionsDiv.innerHTML = '<div class="suggestion-error">Error searching locations</div>';
            suggestionsDiv.style.display = 'block';
        }
    }, 300);
}

async function searchLocations(query) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to search locations');
    }
    
    const data = await response.json();
    return data.results || [];
}

function displayLocationSuggestions(periodId, results) {
    const suggestionsDiv = document.getElementById(`location-suggestions-${periodId}`);
    
    if (results.length === 0) {
        suggestionsDiv.innerHTML = '<div class="suggestion-item no-results">No locations found. Try a different search term.</div>';
        suggestionsDiv.style.display = 'block';
        return;
    }
    
    const suggestionsHTML = results.map(location => {
        const name = location.name;
        const country = location.country;
        const admin1 = location.admin1 ? `, ${location.admin1}` : '';
        const displayName = `${name}${admin1}, ${country}`;
        
        return `
            <div class="suggestion-item" onclick="selectLocation(${periodId}, '${displayName.replace(/'/g, "\\'")}', ${location.latitude}, ${location.longitude})">
                <div class="suggestion-name">${displayName}</div>
                <div class="suggestion-coords">${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}</div>
            </div>
        `;
    }).join('');
    
    suggestionsDiv.innerHTML = suggestionsHTML;
    suggestionsDiv.style.display = 'block';
}

function selectLocation(periodId, displayName, latitude, longitude) {
    const input = document.getElementById(`location-${periodId}`);
    const suggestionsDiv = document.getElementById(`location-suggestions-${periodId}`);
    const coordsInput = document.getElementById(`location-coords-${periodId}`);
    
    input.value = displayName;
    coordsInput.value = JSON.stringify({ displayName, latitude, longitude });
    suggestionsDiv.style.display = 'none';
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.form-group')) {
        document.querySelectorAll('.location-suggestions').forEach(div => {
            div.style.display = 'none';
        });
    }
});

function rerenderPeriods() {
    const container = document.getElementById('periodsContainer');
    container.innerHTML = '';
    
    locationPeriods.forEach((period, index) => {
        const periodElement = createPeriodElement(period, index);
        container.appendChild(periodElement);
    });
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

async function handleSubmit(e) {
    e.preventDefault();
    
    // Collect data from form
    const periods = collectFormData();
    
    // Validate
    const validation = validatePeriods(periods);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    // Show loading state
    showLoading();
    hideError();
    hideResults();

    try {
        // Process each period
        const results = await processAllPeriods(periods);
        
        // Aggregate results
        const aggregated = aggregateResults(results);
        
        // Display results
        displayResults(aggregated, periods);
        
    } catch (error) {
        console.error('Error details:', error);
        
        // Provide more helpful error messages
        let errorMessage = error.message || 'An error occurred while fetching weather data.';
        
        // Add helpful context based on common errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage += ' Please check your internet connection and try again.';
        }
        
        showError(errorMessage);
    } finally {
        hideLoading();
    }
}

function collectFormData() {
    return locationPeriods.map(period => {
        const startDate = document.getElementById(`startDate-${period.id}`).value;
        const endDate = document.getElementById(`endDate-${period.id}`).value;
        const location = document.getElementById(`location-${period.id}`).value;
        
        return {
            startDate,
            endDate,
            location
        };
    });
}

function validatePeriods(periods) {
    for (const period of periods) {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        
        if (start >= end) {
            return {
                valid: false,
                message: 'Start date must be before end date.'
            };
        }

        if (start.getFullYear() < MIN_YEAR) {
            return {
                valid: false,
                message: `Data is only available from ${MIN_YEAR} onwards.`
            };
        }

        if (!period.location.trim()) {
            return {
                valid: false,
                message: 'Please enter a location.'
            };
        }
    }

    return { valid: true };
}

async function processAllPeriods(periods) {
    const results = [];
    
    for (const period of periods) {
        // Check if location has stored coords from autocomplete
        const coordsInput = document.getElementById(`location-coords-${locationPeriods.find(p => 
            document.getElementById(`location-${p.id}`).value === period.location
        )?.id}`);
        
        let coords;
        if (coordsInput && coordsInput.value) {
            // Use stored coordinates
            const storedData = JSON.parse(coordsInput.value);
            coords = {
                name: storedData.displayName.split(',')[0], // Just the city name
                latitude: storedData.latitude,
                longitude: storedData.longitude,
                country: storedData.displayName.split(',').pop().trim()
            };
        } else {
            // Fallback to geocoding
            coords = await geocodeLocation(period.location);
        }
        
        // Fetch weather data
        const weatherData = await fetchWeatherData(
            coords.latitude,
            coords.longitude,
            period.startDate,
            period.endDate
        );
        
        // Analyze data (pass location name for tooltips)
        const analysis = analyzeWeatherData(weatherData, coords.name);
        
        results.push({
            period,
            coords,
            analysis
        });
    }
    
    return results;
}

async function geocodeLocation(locationName) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`;
    
    console.log('Geocoding URL:', url);
    
    const response = await fetch(url);
    console.log('Geocoding response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Geocoding error:', errorText);
        throw new Error(`Failed to geocode location (Status ${response.status})`);
    }
    
    const data = await response.json();
    console.log('Geocoding data:', data);
    
    if (!data.results || data.results.length === 0) {
        throw new Error(`Could not find location: ${locationName}. Please try a different city name.`);
    }
    
    const result = data.results[0];
    return {
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
        country: result.country
    };
}

async function fetchWeatherData(latitude, longitude, startDate, endDate) {
    // Open-Meteo Historical Weather API
    // Note: Using 'cloudcover_mean' as that's the correct parameter name
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=cloudcover_mean&timezone=auto`;
    
    console.log('Weather API URL:', url);
    
    const response = await fetch(url);
    console.log('Weather API response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Weather API error:', errorText);
        throw new Error(`Failed to fetch weather data (Status ${response.status}). ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Weather data received:', data);
    
    // Check if we have the expected data
    if (!data.daily || !data.daily.cloudcover_mean) {
        console.error('Unexpected API response structure:', data);
        throw new Error('Weather data is missing cloud cover information');
    }
    
    return data;
}

function analyzeWeatherData(weatherData, locationName = '') {
    const cloudCover = weatherData.daily.cloudcover_mean;
    const dates = weatherData.daily.time;
    
    let totalDays = 0;
    let totalCloudCoverage = 0;
    
    // Detailed breakdown by category
    let cloudFreeDays = 0;        // 0-15%
    let partlyCloudyDays = 0;     // 16-50%
    let mostlyCloudyDays = 0;     // 51-85%
    let totallyCloudyDays = 0;    // 86-100%
    
    // Yearly breakdown for heatmap
    const yearlyData = {};
    const dailyData = [];
    
    for (let i = 0; i < cloudCover.length; i++) {
        const coverage = cloudCover[i];
        const date = dates[i];
        
        // Skip null/missing data
        if (coverage === null || coverage === undefined) {
            continue;
        }
        
        totalDays++;
        totalCloudCoverage += coverage;
        
        // Store daily data for finer analysis
        dailyData.push({
            date: date,
            cloudCover: coverage
        });
        
        // Categorize the day
        if (coverage <= CLOUD_CATEGORIES.CLEAR) {
            cloudFreeDays++;
        } else if (coverage <= CLOUD_CATEGORIES.PARTLY_CLOUDY) {
            partlyCloudyDays++;
        } else if (coverage <= CLOUD_CATEGORIES.MOSTLY_CLOUDY) {
            mostlyCloudyDays++;
        } else {
            totallyCloudyDays++;
        }
        
        // Track yearly averages with location
        const year = new Date(date).getFullYear();
        if (!yearlyData[year]) {
            yearlyData[year] = { total: 0, count: 0, location: locationName };
        }
        yearlyData[year].total += coverage;
        yearlyData[year].count++;
    }
    
    // Calculate yearly averages
    const yearlyAverages = [];
    for (const year in yearlyData) {
        yearlyAverages.push({
            year: parseInt(year),
            averageCloudCover: yearlyData[year].total / yearlyData[year].count,
            days: yearlyData[year].count,
            location: yearlyData[year].location
        });
    }
    yearlyAverages.sort((a, b) => a.year - b.year);
    
    const averageCloudCover = totalDays > 0 ? totalCloudCoverage / totalDays : 0;
    
    return {
        totalDays,
        averageCloudCover,
        cloudFreeDays,
        partlyCloudyDays,
        mostlyCloudyDays,
        totallyCloudyDays,
        yearlyAverages,
        data: dailyData,
        // Calculate percentages
        cloudFreePercentage: totalDays > 0 ? (cloudFreeDays / totalDays) * 100 : 0,
        partlyCloudyPercentage: totalDays > 0 ? (partlyCloudyDays / totalDays) * 100 : 0,
        mostlyCloudyPercentage: totalDays > 0 ? (mostlyCloudyDays / totalDays) * 100 : 0,
        totallyCloudyPercentage: totalDays > 0 ? (totallyCloudyDays / totalDays) * 100 : 0
    };
}

function aggregateResults(results) {
    let totalDays = 0;
    let totalCloudCoverage = 0;
    let cloudFreeDays = 0;
    let partlyCloudyDays = 0;
    let mostlyCloudyDays = 0;
    let totallyCloudyDays = 0;
    
    // Merge yearly data from all periods
    const yearlyDataMap = {};
    
    for (const result of results) {
        const analysis = result.analysis;
        totalDays += analysis.totalDays;
        totalCloudCoverage += (analysis.averageCloudCover * analysis.totalDays);
        cloudFreeDays += analysis.cloudFreeDays;
        partlyCloudyDays += analysis.partlyCloudyDays;
        mostlyCloudyDays += analysis.mostlyCloudyDays;
        totallyCloudyDays += analysis.totallyCloudyDays;
        
        // Merge yearly averages
        for (const yearData of analysis.yearlyAverages) {
            const year = yearData.year;
            if (!yearlyDataMap[year]) {
                yearlyDataMap[year] = { total: 0, count: 0, locations: [] };
            }
            yearlyDataMap[year].total += (yearData.averageCloudCover * yearData.days);
            yearlyDataMap[year].count += yearData.days;
            if (yearData.location && !yearlyDataMap[year].locations.includes(yearData.location)) {
                yearlyDataMap[year].locations.push(yearData.location);
            }
        }
    }
    
    // Convert to array and calculate final averages
    const yearlyAverages = [];
    for (const year in yearlyDataMap) {
        yearlyAverages.push({
            year: parseInt(year),
            averageCloudCover: yearlyDataMap[year].total / yearlyDataMap[year].count,
            days: yearlyDataMap[year].count,
            locations: yearlyDataMap[year].locations
        });
    }
    yearlyAverages.sort((a, b) => a.year - b.year);
    
    const averageCloudCover = totalDays > 0 ? totalCloudCoverage / totalDays : 0;
    
    // Collect all daily data for finer breakdowns
    const allDailyData = [];
    for (const result of results) {
        allDailyData.push(...result.analysis.data);
    }
    
    return {
        totalDays,
        averageCloudCover,
        cloudFreeDays,
        partlyCloudyDays,
        mostlyCloudyDays,
        totallyCloudyDays,
        yearlyAverages,
        cloudFreePercentage: totalDays > 0 ? (cloudFreeDays / totalDays) * 100 : 0,
        partlyCloudyPercentage: totalDays > 0 ? (partlyCloudyDays / totalDays) * 100 : 0,
        mostlyCloudyPercentage: totalDays > 0 ? (mostlyCloudyDays / totalDays) * 100 : 0,
        totallyCloudyPercentage: totalDays > 0 ? (totallyCloudyDays / totalDays) * 100 : 0,
        periods: results,
        data: allDailyData
    };
}

function generateReportTitle(avgCloudCover) {
    const avg = parseFloat(avgCloudCover);
    if (avg < 30) return 'Clear Skies';
    if (avg < 45) return 'Mostly Sunny';
    if (avg < 55) return 'A Balanced Mix';
    if (avg < 70) return 'Mostly Cloudy';
    return 'Mostly Overcast';
}

function displayResults(aggregated, periods) {
    const resultsDiv = document.getElementById('results');
    
    // Check data reliability - skip if insufficient data
    if (aggregated.totalDays < 30) {
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem 0; color: var(--text-secondary);">
                <p>Insufficient data to generate reliable results. Please ensure your date range includes at least 30 days of data.</p>
            </div>
        `;
        resultsDiv.style.display = 'block';
        return;
    }
    
    const avgCloudCover = aggregated.averageCloudCover.toFixed(1);
    
    // Generate period summary
    let periodSummary = '';
    if (periods.length === 1) {
        periodSummary = `in ${aggregated.periods[0].coords.name}, ${aggregated.periods[0].coords.country}`;
    } else {
        periodSummary = `across ${periods.length} locations`;
    }
    
    // Generate title based on cloud cover
    const reportTitle = generateReportTitle(avgCloudCover);
    
    // Calculate percentages for new finer breakdown
    const clearSkiesPercent = ((aggregated.data.filter(d => d.cloudCover < 30).length / aggregated.totalDays) * 100).toFixed(1);
    const partlyCloudyPercent = ((aggregated.data.filter(d => d.cloudCover >= 30 && d.cloudCover < 50).length / aggregated.totalDays) * 100).toFixed(1);
    const mostlyCloudyPercent = ((aggregated.data.filter(d => d.cloudCover >= 50 && d.cloudCover < 70).length / aggregated.totalDays) * 100).toFixed(1);
    const overcastPercent = ((aggregated.data.filter(d => d.cloudCover >= 70).length / aggregated.totalDays) * 100).toFixed(1);
    
    const clearSkiesDays = aggregated.data.filter(d => d.cloudCover < 30).length;
    const partlyCloudyDays = aggregated.data.filter(d => d.cloudCover >= 30 && d.cloudCover < 50).length;
    const mostlyCloudyDays = aggregated.data.filter(d => d.cloudCover >= 50 && d.cloudCover < 70).length;
    const overcastDays = aggregated.data.filter(d => d.cloudCover >= 70).length;
    
    resultsDiv.innerHTML = `
        <h3>${reportTitle}</h3>
        
        <div class="cloud-cover-hero">
            <div class="hero-value-container">
                <svg id="cloudVisualization" width="280" height="280"></svg>
                <div class="hero-value">${avgCloudCover}%</div>
            </div>
            <div class="hero-label">Average Cloud Cover</div>
            <div class="hero-sublabel">${aggregated.totalDays.toLocaleString()} days analyzed ${periodSummary}</div>
        </div>

        <h4 style="margin-top: 2.5rem; margin-bottom: 1.5rem;">Sky Conditions Breakdown</h4>
        
        <div class="bar-categories">
            <div class="bar-category" style="flex: ${clearSkiesPercent}">
                <div class="bar-cat-icon">☀️</div>
                <div class="bar-cat-label">Clear Skies</div>
                <div class="bar-cat-range">&lt;30%</div>
            </div>
            <div class="bar-category" style="flex: ${partlyCloudyPercent}">
                <div class="bar-cat-icon">⛅</div>
                <div class="bar-cat-label">Partly Cloudy</div>
                <div class="bar-cat-range">30-50%</div>
            </div>
            <div class="bar-category" style="flex: ${mostlyCloudyPercent}">
                <div class="bar-cat-icon">🌥️</div>
                <div class="bar-cat-label">Mostly Cloudy</div>
                <div class="bar-cat-range">50-70%</div>
            </div>
            <div class="bar-category" style="flex: ${overcastPercent}">
                <div class="bar-cat-icon">☁️</div>
                <div class="bar-cat-label">Overcast</div>
                <div class="bar-cat-range">&gt;70%</div>
            </div>
        </div>
        
        <div class="visual-bar">
            <div class="bar-segment bar-clear" style="width: ${clearSkiesPercent}%">
                <span class="bar-percent">${clearSkiesPercent}%</span>
            </div>
            <div class="bar-segment bar-partly" style="width: ${partlyCloudyPercent}%">
                <span class="bar-percent">${partlyCloudyPercent}%</span>
            </div>
            <div class="bar-segment bar-mostly" style="width: ${mostlyCloudyPercent}%">
                <span class="bar-percent">${mostlyCloudyPercent}%</span>
            </div>
            <div class="bar-segment bar-overcast" style="width: ${overcastPercent}%">
                <span class="bar-percent">${overcastPercent}%</span>
            </div>
        </div>
        
        <div class="bar-legend">
            <div class="legend-item">
                <span class="legend-value">${clearSkiesDays.toLocaleString()}</span> days
            </div>
            <div class="legend-item">
                <span class="legend-value">${partlyCloudyDays.toLocaleString()}</span> days
            </div>
            <div class="legend-item">
                <span class="legend-value">${mostlyCloudyDays.toLocaleString()}</span> days
            </div>
            <div class="legend-item">
                <span class="legend-value">${overcastDays.toLocaleString()}</span> days
            </div>
        </div>

        <h4 style="margin-top: 2.5rem; margin-bottom: 1.5rem;">Your Lifetime Cloud Timeline</h4>
        
        ${generateYearlyHeatmapHTML(aggregated.yearlyAverages, aggregated.periods)}
    `;
    
    resultsDiv.style.display = 'block';
    
    // Animate the cloud circle
    animateCloudCircle(parseFloat(avgCloudCover));
}

function animateCloudCircle(cloudPercentage) {
    const svg = d3.select('#cloudVisualization');
    svg.selectAll('*').remove(); // Clear any existing content
    
    const width = 280;
    const height = 280;
    const radius = 130;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create defs for clipping
    const defs = svg.append('defs');
    
    // Create clipping path for the circle
    defs.append('clipPath')
        .attr('id', 'circleClip')
        .append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius);
    
    // Background circle - solid light blue, no border
    svg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius)
        .attr('fill', '#b8d4f1')
        .attr('stroke', 'none');
    
    // Calculate number of clouds to cover the percentage of the circle area
    // Circle area = π * r²
    const circleArea = Math.PI * radius * radius;
    const cloudArea = 400; // Approximate area per cloud
    const totalCloudsNeeded = Math.ceil((circleArea * cloudPercentage / 100) / cloudArea);
    
    // Add cloud shapes
    for (let i = 0; i < totalCloudsNeeded; i++) {
        const cloudGroup = svg.append('g')
            .attr('opacity', 0)
            .attr('clip-path', 'url(#circleClip)');
        
        // Distribute clouds randomly across the entire square canvas
        // Let the circle clip them naturally at the edges
        const cloudX = Math.random() * width;
        const cloudY = Math.random() * height;
        
        // Random cloud size
        const cloudSize = 12 + Math.random() * 10;
        
        // Create a cloud shape using ellipses
        // Main body
        cloudGroup.append('ellipse')
            .attr('cx', cloudX)
            .attr('cy', cloudY)
            .attr('rx', cloudSize)
            .attr('ry', cloudSize * 0.6)
            .attr('fill', 'white')
            .attr('opacity', 0.75);
        
        // Left puff
        cloudGroup.append('ellipse')
            .attr('cx', cloudX - cloudSize * 0.6)
            .attr('cy', cloudY)
            .attr('rx', cloudSize * 0.65)
            .attr('ry', cloudSize * 0.5)
            .attr('fill', 'white')
            .attr('opacity', 0.75);
        
        // Right puff
        cloudGroup.append('ellipse')
            .attr('cx', cloudX + cloudSize * 0.6)
            .attr('cy', cloudY)
            .attr('rx', cloudSize * 0.65)
            .attr('ry', cloudSize * 0.5)
            .attr('fill', 'white')
            .attr('opacity', 0.75);
        
        // Top puff
        cloudGroup.append('ellipse')
            .attr('cx', cloudX)
            .attr('cy', cloudY - cloudSize * 0.3)
            .attr('rx', cloudSize * 0.5)
            .attr('ry', cloudSize * 0.45)
            .attr('fill', 'white')
            .attr('opacity', 0.75);
        
        // Animate clouds fading in with staggered delays
        cloudGroup.transition()
            .delay(200 + i * 100)
            .duration(800)
            .attr('opacity', 1);
        
        // Add subtle floating animation
        function floatCloud() {
            cloudGroup.transition()
                .duration(3000 + Math.random() * 2000)
                .ease(d3.easeSinInOut)
                .attr('transform', `translate(${Math.random() * 4 - 2}, ${Math.random() * 4 - 2})`)
                .on('end', floatCloud);
        }
        
        // Start floating after initial fade in
        setTimeout(() => floatCloud(), 200 + i * 100 + 800);
    }
}

function generateYearlyHeatmapHTML(yearlyAverages, periods) {
    if (!yearlyAverages || yearlyAverages.length === 0) {
        return '<div style="text-align: center; color: #999;">No data available</div>';
    }
    
    // Filter out years with fewer than 5 days of data
    const MIN_DAYS_PER_YEAR = 5;
    const validYearlyAverages = yearlyAverages.filter(y => y.days >= MIN_DAYS_PER_YEAR);
    
    if (validYearlyAverages.length === 0) {
        return '<div style="text-align: center; color: #999;">Insufficient data per year (need at least 5 days per year)</div>';
    }
    
    // Find the full range of years - only use valid years with sufficient data
    const years = validYearlyAverages.map(y => y.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const totalYears = maxYear - minYear + 1;
    
    // Create a map for quick lookup (only valid years with 10+ days)
    const yearDataMap = {};
    validYearlyAverages.forEach(y => {
        yearDataMap[y.year] = y;
    });
    
    // Find min and max cloud cover for color scaling (excluding gaps and insufficient data)
    const cloudCoverValues = validYearlyAverages.map(y => y.averageCloudCover);
    const minCloudCover = Math.min(...cloudCoverValues);
    const maxCloudCover = Math.max(...cloudCoverValues);
    
    // Generate stripes for all years, including gaps
    const stripes = [];
    for (let year = minYear; year <= maxYear; year++) {
        const width = (100 / totalYears).toFixed(2);
        
        if (yearDataMap[year]) {
            // Year has data
            const yearData = yearDataMap[year];
            const color = getCloudColorForPercentage(yearData.averageCloudCover, minCloudCover, maxCloudCover);
            const locationText = yearData.locations && yearData.locations.length > 0 
                ? ` in ${yearData.locations.join(', ')}` 
                : '';
            
            stripes.push(`<div class="heatmap-stripe" 
                         style="width: ${width}%; background: ${color};" 
                         data-year="${year}" 
                         data-cloud="${yearData.averageCloudCover.toFixed(1)}%"
                         title="${year}${locationText}: ${yearData.averageCloudCover.toFixed(1)}% cloud cover">
                    </div>`);
        } else {
            // Gap year or insufficient data - show as empty/striped pattern
            stripes.push(`<div class="heatmap-stripe heatmap-gap" 
                         style="width: ${width}%;" 
                         data-year="${year}"
                         title="${year}: Insufficient data (&lt;5 days)">
                    </div>`);
        }
    }
    
    // Generate colors for legend
    const minColor = getCloudColorForPercentage(minCloudCover, minCloudCover, maxCloudCover);
    const maxColor = getCloudColorForPercentage(maxCloudCover, minCloudCover, maxCloudCover);
    
    const hasGaps = totalYears > validYearlyAverages.length;
    
    return `
        <div class="heatmap-container">
            <div class="heatmap-stripes">
                ${stripes.join('')}
            </div>
            <div class="heatmap-scale">
                <div class="scale-bar" style="background: linear-gradient(to right, ${minColor}, ${maxColor});"></div>
                <div class="scale-labels">
                    <span>${minCloudCover.toFixed(1)}% (clearest year)</span>
                    <span>${maxCloudCover.toFixed(1)}% (cloudiest year)</span>
                </div>
                ${hasGaps ? '<div class="gap-note">⚠️ Gray stripes indicate years with insufficient data (&lt;5 days)</div>' : ''}
            </div>
        </div>
    `;
}

function getCloudColorForPercentage(percentage, minValue = 0, maxValue = 100) {
    // Continuous gradient from sunny (warm orange) to cloudy (cool gray)
    // Normalize based on the actual range of data
    
    const range = maxValue - minValue;
    const t = range > 0 ? (percentage - minValue) / range : 0.5; // Normalize to 0-1 based on actual range
    
    // Define gradient stops
    const sunnyColor = { r: 253, g: 160, b: 133 }; // #fda085 (warm orange)
    const cloudyColor = { r: 85, g: 102, b: 119 };  // #556677 (cool gray)
    
    // Linear interpolation between colors
    const r = Math.round(sunnyColor.r + (cloudyColor.r - sunnyColor.r) * t);
    const g = Math.round(sunnyColor.g + (cloudyColor.g - sunnyColor.g) * t);
    const b = Math.round(sunnyColor.b + (cloudyColor.b - sunnyColor.b) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
}

function generateFunFact(aggregated) {
    const facts = [];
    
    // Insight based on average cloud cover
    if (aggregated.averageCloudCover < 30) {
        facts.push(`You've lived under remarkably clear skies! With only ${aggregated.averageCloudCover.toFixed(1)}% average cloud cover, you've experienced ${aggregated.cloudFreeDays.toLocaleString()} completely cloud-free days.`);
    } else if (aggregated.averageCloudCover > 70) {
        facts.push(`You've lived under predominantly overcast skies with ${aggregated.averageCloudCover.toFixed(1)}% average cloud cover. That's ${aggregated.totallyCloudyDays.toLocaleString()} totally cloudy days!`);
    } else {
        facts.push(`With ${aggregated.averageCloudCover.toFixed(1)}% average cloud cover, you've experienced a balanced mix of sky conditions throughout your life.`);
    }
    
    // Additional insight about extremes
    if (aggregated.totallyCloudyDays > aggregated.cloudFreeDays * 2) {
        facts.push(`You've had ${(aggregated.totallyCloudyDays / aggregated.cloudFreeDays).toFixed(1)}x more totally cloudy days than cloud-free days!`);
    } else if (aggregated.cloudFreeDays > aggregated.totallyCloudyDays * 2) {
        facts.push(`You've enjoyed ${(aggregated.cloudFreeDays / aggregated.totallyCloudyDays).toFixed(1)}x more cloud-free days than totally cloudy ones!`);
    }
    
    const years = (aggregated.totalDays / 365.25).toFixed(1);
    facts.push(`That's ${years} years of weather history analyzed across ${aggregated.totalDays.toLocaleString()} days.`);
    
    return facts.filter(f => f).join(' ');
}

// UI Helper Functions
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showResults() {
    document.getElementById('results').style.display = 'block';
}

function hideResults() {
    document.getElementById('results').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

