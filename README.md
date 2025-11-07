# ☁️ Your Cloudy Days Calculator

A web application that calculates the proportion of cloudy vs. sunny days you've experienced in your lifetime based on your location(s) and historical weather data.

## Features

- Calculate average cloud cover percentage across your lifetime (1970 to present)
- **Multiple Location Support**: Add all the cities you've lived in with start/end dates
- **Yearly Cloudiness Heatmap**: Visual timeline where each stripe represents a year, color-coded by average cloud cover
  - Gaps in your location history are shown as gray striped areas
  - Colors are normalized to your personal data range for better contrast
 
## How to Use

1. Open `index.html` in a web browser
2. **Add your first location:**
   - Enter start date (birth date or any date from 1970 onwards)
   - End date defaults to today, but adjust if you moved
   - Enter your location (city name)
3. **Add more locations** (if you've moved):
   - Click "➕ Add Another Location"
   - Enter dates and location for each place you've lived
   - Gaps between periods will show in the heatmap
4. Click "Calculate My Cloudy Days"
5. View your personalized weather report!

## Data Source

Weather data is provided by [Open-Meteo.com](https://open-meteo.com/), which offers:
- Historical weather data from 1940-present
- Global coverage
- Free API with no authentication required
- Daily cloud cover percentages

## Technical Details

### Cloud Cover Categories
Days are categorized based on mean daily cloud cover percentage:
- **Cloud-Free**: 0-15% coverage
- **Partly Cloudy**: 16-50% coverage
- **Mostly Cloudy**: 51-85% coverage
- **Totally Cloudy**: 86-100% coverage

### Architecture
The app fully supports multiple location periods:
- **Data model**: Array of location periods with start/end dates
- **Modular calculation**: Each period is processed independently and aggregated
- **Gap handling**: Years without location data are visualized in the heatmap
- **Smart aggregation**: Overlapping periods are merged, gaps are preserved

### Files
- `index.html` - Main HTML structure
- `styles.css` - Modern, responsive styling
- `app.js` - Application logic and API integration

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- CSS Grid
- Fetch API

## Attribution

Weather data provided by [Open-Meteo.com](https://open-meteo.com/)

