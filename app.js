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
});

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
    
    for (let i = 0; i < cloudCover.length; i++) {
        const coverage = cloudCover[i];
        const date = dates[i];
        
        // Skip null/missing data
        if (coverage === null || coverage === undefined) {
            continue;
        }
        
        totalDays++;
        totalCloudCoverage += coverage;
        
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
        periods: results
    };
}

function displayResults(aggregated, periods) {
    const resultsDiv = document.getElementById('results');
    
    const avgCloudCover = aggregated.averageCloudCover.toFixed(1);
    
    // Generate period summary
    let periodSummary = '';
    if (periods.length === 1) {
        periodSummary = `in ${aggregated.periods[0].coords.name}, ${aggregated.periods[0].coords.country}`;
    } else {
        periodSummary = `across ${periods.length} locations`;
    }
    
    // Fun facts
    const funFact = generateFunFact(aggregated);
    
    // Calculate percentages for display
    const cloudFreePercent = aggregated.cloudFreePercentage.toFixed(1);
    const partlyCloudyPercent = aggregated.partlyCloudyPercentage.toFixed(1);
    const mostlyCloudyPercent = aggregated.mostlyCloudyPercentage.toFixed(1);
    const totallyCloudyPercent = aggregated.totallyCloudyPercentage.toFixed(1);
    
    resultsDiv.innerHTML = `
        <h3>Your Cloudy Days Report</h3>
        
        ${funFact ? `
        <div class="fun-fact" style="margin-bottom: 2rem;">
            <h4>💡 Insights</h4>
            <p>${funFact}</p>
        </div>
        ` : ''}
        
        <div class="stats-grid">
            <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="stat-value">${aggregated.totalDays.toLocaleString()}</div>
                <div class="stat-label">Total Days</div>
                <div class="stat-sublabel">${periodSummary}</div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, #a8b8c0 0%, #6c757d 100%);">
                <div class="stat-value">${avgCloudCover}%</div>
                <div class="stat-label">Average Cloud Cover</div>
                <div class="stat-sublabel">across your lifetime</div>
            </div>
        </div>

        <h4 style="margin-top: 2rem; margin-bottom: 1rem; color: #2c3e50;">Daily Sky Conditions Breakdown</h4>
        
        <div class="category-breakdown">
            <div class="category-item clear">
                <div class="category-icon">☀️</div>
                <div class="category-content">
                    <div class="category-title">Cloud-Free Days</div>
                    <div class="category-subtitle">0-15% cloud cover</div>
                </div>
                <div class="category-stats">
                    <div class="category-percent">${cloudFreePercent}%</div>
                    <div class="category-count">${aggregated.cloudFreeDays.toLocaleString()} days</div>
                </div>
            </div>
            
            <div class="category-item partly">
                <div class="category-icon">⛅</div>
                <div class="category-content">
                    <div class="category-title">Partly Cloudy</div>
                    <div class="category-subtitle">16-50% cloud cover</div>
                </div>
                <div class="category-stats">
                    <div class="category-percent">${partlyCloudyPercent}%</div>
                    <div class="category-count">${aggregated.partlyCloudyDays.toLocaleString()} days</div>
                </div>
            </div>
            
            <div class="category-item mostly">
                <div class="category-icon">🌥️</div>
                <div class="category-content">
                    <div class="category-title">Mostly Cloudy</div>
                    <div class="category-subtitle">51-85% cloud cover</div>
                </div>
                <div class="category-stats">
                    <div class="category-percent">${mostlyCloudyPercent}%</div>
                    <div class="category-count">${aggregated.mostlyCloudyDays.toLocaleString()} days</div>
                </div>
            </div>
            
            <div class="category-item overcast">
                <div class="category-icon">☁️</div>
                <div class="category-content">
                    <div class="category-title">Totally Cloudy</div>
                    <div class="category-subtitle">86-100% cloud cover</div>
                </div>
                <div class="category-stats">
                    <div class="category-percent">${totallyCloudyPercent}%</div>
                    <div class="category-count">${aggregated.totallyCloudyDays.toLocaleString()} days</div>
                </div>
            </div>
        </div>

        <div class="visual-bar">
            <div class="bar-segment" style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); width: ${cloudFreePercent}%">
                ${cloudFreePercent > 8 ? `${cloudFreePercent}%` : ''}
            </div>
            <div class="bar-segment" style="background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); width: ${partlyCloudyPercent}%">
                ${partlyCloudyPercent > 8 ? `${partlyCloudyPercent}%` : ''}
            </div>
            <div class="bar-segment" style="background: linear-gradient(135deg, #a8b8c0 0%, #8a9ba8 100%); width: ${mostlyCloudyPercent}%">
                ${mostlyCloudyPercent > 8 ? `${mostlyCloudyPercent}%` : ''}
            </div>
            <div class="bar-segment" style="background: linear-gradient(135deg, #667788 0%, #556677 100%); width: ${totallyCloudyPercent}%">
                ${totallyCloudyPercent > 8 ? `${totallyCloudyPercent}%` : ''}
            </div>
        </div>

        <h4 style="margin-top: 2rem; margin-bottom: 1rem; color: #2c3e50;">Yearly Cloudiness Timeline</h4>
        
        ${generateYearlyHeatmapHTML(aggregated.yearlyAverages)}
    `;
    
    resultsDiv.style.display = 'block';
}

function generateYearlyHeatmapHTML(yearlyAverages) {
    if (!yearlyAverages || yearlyAverages.length === 0) {
        return '<div style="text-align: center; color: #999;">No data available</div>';
    }
    
    // Find the full range of years (including gaps)
    const years = yearlyAverages.map(y => y.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const totalYears = maxYear - minYear + 1;
    
    // Create a map for quick lookup
    const yearDataMap = {};
    yearlyAverages.forEach(y => {
        yearDataMap[y.year] = y;
    });
    
    // Find min and max cloud cover for color scaling (excluding gaps)
    const cloudCoverValues = yearlyAverages.map(y => y.averageCloudCover);
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
            // Gap year - show as empty/striped pattern
            stripes.push(`<div class="heatmap-stripe heatmap-gap" 
                         style="width: ${width}%;" 
                         data-year="${year}"
                         title="${year}: No data (gap in locations)">
                    </div>`);
        }
    }
    
    // Generate colors for legend
    const minColor = getCloudColorForPercentage(minCloudCover, minCloudCover, maxCloudCover);
    const maxColor = getCloudColorForPercentage(maxCloudCover, minCloudCover, maxCloudCover);
    
    const hasGaps = totalYears > yearlyAverages.length;
    
    return `
        <div class="heatmap-container">
            <div class="heatmap-stripes">
                ${stripes.join('')}
            </div>
            <div class="heatmap-labels">
                <span>${minYear}</span>
                <span>${maxYear}</span>
            </div>
            <div class="heatmap-scale">
                <div class="scale-bar" style="background: linear-gradient(to right, ${minColor}, ${maxColor});"></div>
                <div class="scale-labels">
                    <span>${minCloudCover.toFixed(1)}% (clearest year)</span>
                    <span>${maxCloudCover.toFixed(1)}% (cloudiest year)</span>
                </div>
                ${hasGaps ? '<div class="gap-note">⚠️ Gray stripes indicate years with no location data</div>' : ''}
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

