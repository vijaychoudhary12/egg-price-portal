// script.js

// Global chart instances and other necessary global variables
let priceMap = null;
let mapMarkersLayer = null;
let allMarkers = {};
let activeLines = [];
let activeHighlights = [];

let priceTrendChart = null;
let predictionChart = null; // For individual city: Historical vs. 24-Month Prediction
let yearlyAvgChart = null;
let monthlyAvgChart = null;
let comparisonTrendChart = null;
let comparisonPredictionChart = null; // For comparison: Calendar Year Prediction

let consolidatedData = []; // Stores prediction data for all NECC cities for the consolidated table
const MAX_COMPARE_CITIES = 4; // Set the maximum number of cities to compare
const comparisonColors = [
    'rgb(78, 115, 223)',  // Primary
    'rgb(231, 74, 59)',   // Danger
    'rgb(28, 200, 138)',  // Success
    'rgb(246, 194, 62)'   // Warning
];

// Placeholder for district coordinates - should ideally be fetched from the backend or a static file
// Ensure this list is comprehensive and matches your DB/expected data
const districtCoordinates = {
    'Agra': {'lat': 27.1767, 'lon': 78.0081},
    'Ahmedabad': {'lat': 23.0225, 'lon': 72.5714},
    'Ahmednagar': {'lat': 19.0941, 'lon': 74.7381},
    'Ajmer': {'lat': 26.4499, 'lon': 74.6399},
    'Alipurduar': {'lat': 26.4866, 'lon': 89.5288},
    'Allahabad (CC)': {'lat': 25.4358, 'lon': 81.8463},
    'Almora': {'lat': 29.5937, 'lon': 79.6603},
    'Alwar': {'lat': 27.5530, 'lon': 76.6346},
    'Ambala': {'lat': 30.3782, 'lon': 76.7767},
    'Amritsar': {'lat': 31.6340, 'lon': 74.8723},
    'Anakapalli': {'lat': 17.6879, 'lon': 83.0100},
    'Aurangabad (Chhatrapati Sambhajinagar)': {'lat': 19.8762, 'lon': 75.3433},
    'Ayodhya': {'lat': 26.7917, 'lon': 82.1981},
    'Baramulla': {'lat': 34.1931, 'lon': 74.3502},
    'Bareilly': {'lat': 28.3670, 'lon': 79.4304},
    'Barmer': {'lat': 25.7498, 'lon': 71.4111},
    'Barwala': {'lat': 29.3711, 'lon': 75.9044},
    'Bathinda': {'lat': 30.2110, 'lon': 74.9455},
    'Belagavi': {'lat': 15.8497, 'lon': 74.4977},
    'Bengaluru Urban': {'lat': 12.9716, 'lon': 77.5946},
    'Bengaluru (CC)': {'lat': 12.9716, 'lon': 77.5946},
    'Bhopal': {'lat': 23.2599, 'lon': 77.4126},
    'Bidar': {'lat': 17.9104, 'lon': 77.5199},
    'Bikaner': {'lat': 28.0229, 'lon': 73.3119},
    'Brahmapur (OD)': {'lat': 19.3151, 'lon': 84.7941},
    'Cachar': {'lat': 24.8201, 'lon': 92.7919},
    'Chamba': {'lat': 32.5533, 'lon': 76.1257},
    'Chamoli': {'lat': 30.4045, 'lon': 79.5604},
    'Chandigarh': {'lat': 30.7333, 'lon': 76.7794},
    'Chennai': {'lat': 13.0827, 'lon': 80.2707},
    'Chennai (CC)': {'lat': 13.0827, 'lon': 80.2707},
    'Chengalpattu': {'lat': 12.6944, 'lon': 79.9815},
    'Chittoor': {'lat': 13.2171, 'lon': 79.0977},
    'Coimbatore': {'lat': 11.0168, 'lon': 76.9558},
    'Darbhanga': {'lat': 26.1512, 'lon': 85.8940},
    'Darjeeling': {'lat': 27.0410, 'lon': 88.2663},
    'Dehradun': {'lat': 30.3165, 'lon': 78.0322},
    'Delhi': {'lat': 28.7041, 'lon': 77.1025},
    'Delhi (CC)': {'lat': 28.7041, 'lon': 77.1025},
    'Devbhumi Dwarka': {'lat': 22.2405, 'lon': 68.9688},
    'Dibrugarh': {'lat': 27.4728, 'lon': 94.9117},
    'Dimapur': {'lat': 25.9060, 'lon': 93.7376},
    'E.Godavari': {'lat': 16.9891, 'lon': 82.2475},
    'East Khasi Hills': {'lat': 25.5764, 'lon': 91.8833},
    'Ernakulam': {'lat': 9.9312, 'lon': 76.2673},
    'Faridabad': {'lat': 28.4089, 'lon': 77.3178},
    'Ferozepur': {'lat': 30.9243, 'lon': 74.6017},
    'Gandhinagar': {'lat': 23.2156, 'lon': 72.6369},
    'Ghaziabad': {'lat': 28.6692, 'lon': 77.4538},
    'Gorakhpur': {'lat': 26.7606, 'lon': 83.3732},
    'Gurugram': {'lat': 28.4595, 'lon': 77.0266},
    'Gwalior': {'lat': 26.2183, 'lon': 78.1828},
    'Haridwar': {'lat': 29.9457, 'lon': 78.1642},
    'Hospet': {'lat': 15.2699, 'lon': 76.3872},
    'Hyderabad': {'lat': 17.3850, 'lon': 78.4867},
    'Indore': {'lat': 22.7196, 'lon': 75.8577},
    'Indore (CC)': {'lat': 22.7196, 'lon': 75.8577},
    'Jabalpur': {'lat': 23.1815, 'lon': 79.9864},
    'Jagatsinghpur': {'lat': 20.2663, 'lon': 86.1691},
    'Jaipur': {'lat': 26.9124, 'lon': 75.7873},
    'Jaisalmer': {'lat': 26.9157, 'lon': 70.9083},
    'Jalandhar': {'lat': 31.3260, 'lon': 75.5762},
    'Jalpaiguri': {'lat': 26.5277, 'lon': 88.7157},
    'Jammu': {'lat': 32.7266, 'lon': 74.8570},
    'Jamnagar': {'lat': 22.4707, 'lon': 70.0577},
    'Jhansi': {'lat': 25.4484, 'lon': 78.5685},
    'Jodhpur': {'lat': 26.2389, 'lon': 73.0243},
    'Jorhat': {'lat': 26.7528, 'lon': 94.2129},
    'Kamrup Metropolitan': {'lat': 26.1445, 'lon': 91.7362},
    'Kannur': {'lat': 11.8745, 'lon': 75.3704},
    'Kanpur Nagar': {'lat': 26.4499, 'lon': 80.3319},
    'Kanpur (CC)': {'lat': 26.4499, 'lon': 80.3319},
    'Katihar': {'lat': 25.5433, 'lon': 87.5694},
    'Khordha': {'lat': 20.1817, 'lon': 85.6686},
    'Kodagu': {'lat': 12.3375, 'lon': 75.7420},
    'Kolkata': {'lat': 22.5726, 'lon': 88.3639},
    'Kolkata (WB)': {'lat': 22.5726, 'lon': 88.3639},
    'Kollam': {'lat': 8.8932, 'lon': 76.6141},
    'Kutch': {'lat': 23.7337, 'lon': 69.8597},
    'Lakshadweep': {'lat': 10.5667, 'lon': 72.6417},
    'Leh': {'lat': 34.1526, 'lon': 77.5771},
    'Lucknow': {'lat': 26.8467, 'lon': 80.9462},
    'Ludhiana': {'lat': 30.9010, 'lon': 75.8573},
    'Luknow (CC)': {'lat': 26.8467, 'lon': 80.9462},
    'Madurai': {'lat': 9.9252, 'lon': 78.1198},
    'Mathura': {'lat': 27.4924, 'lon': 77.6737},
    'Medchal-Malkajgiri': {'lat': 17.5268, 'lon': 78.5519},
    'Meerut': {'lat': 28.9845, 'lon': 77.7064},
    'Mumbai City': {'lat': 18.9248, 'lon': 72.8347},
    'Mumbai Suburban': {'lat': 19.1136, 'lon': 72.8697},
    'Mumbai (CC)': {'lat': 19.0760, 'lon': 72.8777},
    'Muzaffurpur': {'lat': 26.1224, 'lon': 85.3903},
    'Muzaffurpur (CC)': {'lat': 26.1224, 'lon': 85.3903},
    'Mysuru': {'lat': 12.2958, 'lon': 76.6394},
    'Nagpur': {'lat': 21.1458, 'lon': 79.0882},
    'Nainital': {'lat': 29.3803, 'lon': 79.4636},
    'Namakkal': {'lat': 11.2203, 'lon': 78.1696},
    'Nashik': {'lat': 19.9975, 'lon': 73.7898},
    'Nilgiris': {'lat': 11.4100, 'lon': 76.7300},
    'North 24 Parganas': {'lat': 22.7383, 'lon': 88.6121},
    'North Goa': {'lat': 15.5990, 'lon': 73.8739},
    'Panchkula': {'lat': 30.6942, 'lon': 76.8606},
    'Paschim Bardhaman': {'lat': 23.6816, 'lon': 86.9537},
    'Paschim Medinipur': {'lat': 22.4370, 'lon': 87.3224},
    'Pathankot': {'lat': 32.2661, 'lon': 75.6149},
    'Patna': {'lat': 25.5941, 'lon': 85.1376},
    'Pauri Garhwal': {'lat': 30.1484, 'lon': 78.7754},
    'Pithoragarh': {'lat': 29.5826, 'lon': 80.2180},
    'Porbandar': {'lat': 21.6417, 'lon': 69.6293},
    'Prayagraj': {'lat': 25.4358, 'lon': 81.8463},
    'Pulwama': {'lat': 33.8701, 'lon': 74.8952},
    'Pune': {'lat': 18.5204, 'lon': 73.8567},
    'Purnea': {'lat': 25.7775, 'lon': 87.4753},
    'Raigad': {'lat': 18.5166, 'lon': 73.1822},
    'Raipur': {'lat': 21.2514, 'lon': 81.6296},
    'Rajouri': {'lat': 33.3786, 'lon': 74.3016},
    'Ramanathapuram': {'lat': 9.3639, 'lon': 78.8367},
    'Ramgarh': {'lat': 23.6389, 'lon': 85.5181},
    'Ranchi': {'lat': 23.3441, 'lon': 85.3096},
    'Ranchi (CC)': {'lat': 23.3441, 'lon': 85.3096},
    'Ranipet': {'lat': 12.9283, 'lon': 79.3311},
    'Sagar': {'lat': 23.8388, 'lon': 78.7378},
    'Saharanpur': {'lat': 29.9641, 'lon': 77.5460},
    'Shimla': {'lat': 31.1048, 'lon': 77.1734},
    'Sirsa': {'lat': 29.5348, 'lon': 75.0271},
    'Solan': {'lat': 30.9085, 'lon': 77.0992},
    'Sonitpur': {'lat': 26.6733, 'lon': 92.7897},
    'South Goa': {'lat': 15.2993, 'lon': 74.1240},
    'Sri Ganganagar': {'lat': 29.9087, 'lon': 73.8637},
    'Srinagar': {'lat': 34.0837, 'lon': 74.7973},
    'Surat': {'lat': 21.1702, 'lon': 72.8311},
    'Thanjavur': {'lat': 10.7870, 'lon': 79.1378},
    'Thiruvananthapuram': {'lat': 8.5241, 'lon': 76.9366},
    'Thoothukudi': {'lat': 8.7642, 'lon': 78.1348},
    'Tirunelveli': {'lat': 8.7139, 'lon': 77.7567},
    'Udhampur': {'lat': 32.9283, 'lon': 75.1390},
    'Uttara Kannada': {'lat': 14.9642, 'lon': 74.4703},
    'Vadodara': {'lat': 22.3072, 'lon': 73.1812},
    'Varanasi': {'lat': 25.3176, 'lon': 82.9739},
    'Varanasi (CC)': {'lat': 25.3176, 'lon': 82.9739},
    'Vikarabad': {'lat': 17.3311, 'lon': 77.9003},
    'Vijayawada': {'lat': 16.5062, 'lon': 80.6480},
    'Visakhapatnam': {'lat': 17.6868, 'lon': 83.2185},
    'Vizag': {'lat': 17.7240, 'lon': 82.7347},
    'Vizianagaram': {'lat': 18.1067, 'lon': 83.3956},
    'W.Godavari': {'lat': 16.7127, 'lon': 81.1015},
    'Warangal': {'lat': 17.9689, 'lon': 79.5941},
    'West Tripura': {'lat': 23.8315, 'lon': 91.2868}
    // Ensure this list is comprehensive as per your DB
};

// Store NECC cities for dropdowns and other logic
let neccCitiesForDropdown = [];
let districtsForDropdown = [];

// Store fetched prediction data for the currently selected city
let currentCityPredictionData = null;
// Store historical monthly averages for the currently selected city for charting
let currentCityHistoricalMonthlyAverages = [];


// --- LOADER FUNCTIONS ---
function showLoading(message = "Loading data...") {
    $('#loaderText').text(message);
    $('#loader').show();
}

function hideLoading() {
    $('#loader').hide();
}


// --- INITIALIZATION ---
$(document).ready(function() {
    showLoading("Initializing portal...");

    // Initialize Select2 dropdowns
    $('#districtSelect').select2({ theme: "bootstrap-5", placeholder: "- Select District -" });
    $('#neccCitySelect').select2({ theme: "bootstrap-5", placeholder: "- Select NECC City -" });
    // Set maximumSelectionLength for the comparison modal Select2
    $('#cityComparisonSelect').select2({ theme: "bootstrap-5", placeholder: `Select up to ${MAX_COMPARE_CITIES} cities`, allowClear: true, maximumSelectionLength: MAX_COMPARE_CITIES });


    // Set current year in footer using Moment.js
    $('#currentYear').text(moment().year());

    // Event Listeners
    $('#districtSelect').on('change', function() {
        const district = $(this).val();
        if (district) {
            $('#neccCitySelect').val("").trigger('change.select2'); // Clear NECC city
            fetchDataForLocation(district, 'district');
        } else {
            // Handle case where district selection is cleared
            resetDashboardView();
        }
    });

    $('#neccCitySelect').on('change', function() {
        const neccCity = $(this).val();
        if (neccCity) {
            $('#districtSelect').val("").trigger('change.select2'); // Clear district
            fetchDataForLocation(neccCity, 'necc');
        } else {
            // Handle case where NECC city selection is cleared
            resetDashboardView();
        }
    });

    $('#applyDateRange').on('click', applyDateRangeFilter);
    $('#resetDateRange').on('click', resetDateFiltersAndReload);

    // Tab persistence and re-initialization for charts/map
    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        const targetTab = $(e.target).attr("id");
        localStorage.setItem('activeTab', targetTab);
        // Invalidate size for elements that might be hidden when tab is not active
        if (targetTab === "map-tab" && priceMap) {
            priceMap.invalidateSize();
             // Re-center map to selected city if there is one
            if($('#selectedLocationName').text() !== 'Selected City' && currentCityPredictionData) {
                 const selectedLocationName = $('#selectedLocationName').text(); // This could be district name
                 // Use the effective NECC city name from prediction data for map centering
                 const effectiveCityName = currentCityPredictionData.city_name_used_for_prediction;

                 const selectedCityMarker = allMarkers[effectiveCityName];
                 if(selectedCityMarker) {
                     priceMap.setView(selectedCityMarker.getLatLng(), 8);
                 } else {
                     // Fallback: if effective NECC city marker not found, try centering on the initially selected location's coordinates
                     if (districtCoordinates[selectedLocationName]) {
                         priceMap.setView([districtCoordinates[selectedLocationName].lat, districtCoordinates[selectedLocationName].lon], 9);
                     }
                 }
            } else {
                 // If no location selected, center on India view
                 if (priceMap) {
                     priceMap.setView([20.5937, 78.9629], 5);
                 }
            }
        } else if (targetTab === "trends-tab" && priceTrendChart) {
             if(priceTrendChart.ctx) priceTrendChart.resize(); // Check if chart context exists before resize
        } else if (targetTab === "predictions-tab" && predictionChart) {
             if(predictionChart.ctx) predictionChart.resize(); // Check if chart context exists before resize
        } else if (targetTab === "averages-tab" && (yearlyAvgChart || monthlyAvgChart)) {
             if(yearlyAvgChart && yearlyAvgChart.ctx) yearlyAvgChart.resize();
             if(monthlyAvgChart && monthlyAvgChart.ctx) monthlyAvgChart.resize();
        }
    });

    // Restore last active tab on load
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab) {
        $(`#${activeTab}`).tab('show');
    } else {
         $('#trends-tab').tab('show'); // Default tab
    }


    // Fetch initial data (dropdowns, and default city view)
    Promise.all([fetchNeccCities(), fetchDistricts()])
        .then(() => {
            // Populate comparison modal dropdown after NECC cities are fetched
            populateCityComparisonSelect();
            // Load default view (e.g., Ahmedabad)
            const defaultCity = "Ahmedabad";
            // Use a slight delay to ensure Select2 is fully rendered before triggering change
             setTimeout(() => {
                $('#neccCitySelect').val(defaultCity).trigger('change');
             }, 100);

            // Fetch all predictions for the consolidated table in background after cities are loaded
            // This fetch is independent of the selected location in the main dashboard
            fetchAllPredictionsForConsolidatedTable();
        })
        .catch(error => {
            console.error("Error initializing portal:", error);
            alert("Error initializing portal. Please try refreshing the page.");
            hideLoading();
             resetDashboardView(); // Reset view on initialization error
        });

    $('#compareCitiesBtn').on('click', function() {
        // Reset comparison view if no cities are selected when modal is opened/re-opened
        if (! $('#cityComparisonSelect').val() || $('#cityComparisonSelect').val().length === 0) {
             resetComparisonView();
        }
    });
    // Use change.select2 to avoid issues with programmatic changes
    $('#cityComparisonSelect').on('change.select2', handleCityComparisonChange);

     // Initialize map explicitly
     initializeMap();
});


// --- API CALLS ---
function fetchNeccCities() {
    return fetch('/api/necc_cities')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(cities => {
            // Assuming the backend endpoint /api/necc_cities returns only NECC cities
            neccCitiesForDropdown = cities.map(city => city.name).sort();
            const select = $('#neccCitySelect');
            select.empty().append(new Option('- Select NECC City -', ''));
            neccCitiesForDropdown.forEach(city => {
                select.append(new Option(city, city));
            });
        })
        .catch(error => {
             console.error('Error fetching NECC cities:', error);
             // Do not alert here, handled during overall initialization catch
             throw error; // Propagate error
        });
}

function fetchDistricts() {
    return fetch('/api/districts')
        .then(response => {
             if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
             return response.json();
        })
        .then(districts => {
            districtsForDropdown = districts.map(d => d.name).sort();
            const select = $('#districtSelect');
            select.empty().append(new Option('- Select District -', ''));
            districtsForDropdown.forEach(district => {
                select.append(new Option(district, district));
            });
        })
        .catch(error => {
            console.error('Error fetching districts:', error);
            // Do not alert here, handled during overall initialization catch
            throw error; // Propagate error
        });
}

function fetchDataForLocation(locationName, type) {
    showLoading(`Loading data for ${locationName}...`);
    resetTabsToDefault(); // Reset to trends tab on new location selection

    // Determine if we need to fetch price history for the last 5 years or full history
    // By default, fetch for the last 5 years for trend chart clarity as requested
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(5, 'years').startOf('year').format('YYYY-MM-DD'); // Start of the year 5 years ago


    // Fetch all necessary data for the selected location concurrently
    // Note: Prediction data now includes the effective_city_name used for prediction
    Promise.all([
        fetchPriceHistory(locationName, type, startDate, endDate), // Fetch price history for last 5 years
        fetchAveragePrices(locationName, type), // Fetch averages which include full historical monthly for average charts
        fetchPredictionData(locationName, type),
    ])
    .then(([priceHistory, averagePrices, predictionData]) => {
        // Store fetched prediction data and historical monthly averages for charting
        currentCityPredictionData = predictionData;
        currentCityHistoricalMonthlyAverages = averagePrices.monthly_avg_last_5_years; // Store historical monthlies from averages endpoint


        // Fetch nearby districts based on the effective city name from predictionData
        // If it's an NECC city directly, use locationName. If district, use city_name_used_for_prediction
        const effectiveCityForMap = type === 'necc' ? locationName : predictionData?.city_name_used_for_prediction;
        return fetchNearbyDistrictsForMap(effectiveCityForMap)
             .then(nearbyDistricts => {
                 // Update UI components with the fetched data
                 updateLocationInfo(locationName, type, predictionData.distance_to_necc, predictionData.city_name_used_for_prediction);

                 // Key Metrics
                 updateKeyMetricsDisplay(locationName, predictionData);

                 // Price Trends - Use the prices fetched for the last 5 years
                 renderPriceTrendChart(priceHistory.prices, locationName);
                 // setDefaultDateRange(priceHistory.prices); // No longer needed as we fetch for fixed range

                 // Averages - Use the data from averagePrices endpoint (full historical is handled there)
                 renderYearlyAverageChart(averagePrices.yearly_avg, locationName);
                 renderMonthlyAverageChart(currentCityHistoricalMonthlyAverages, locationName); // Use stored historical monthlies

                 // Predictions Tab (Table, Chart, and Summary Table)
                 // Pass the prediction data including dynamic averages and calendar year info
                 renderPredictionDataTab(locationName, currentCityPredictionData, currentCityHistoricalMonthlyAverages);

                 // Map: Update map center and highlight, nearby districts
                 updateMapForSelectedLocation(locationName, type, nearbyDistricts, predictionData.latest_price_info?.price, effectiveCityForMap);

                 $('#dynamicLocationName').text(locationName);
                 hideLoading();
             });
    })
    .catch(error => {
        console.error(`Error fetching data for ${locationName}:`, error);
        alert(`Could not load data for ${locationName}. ${error.message || 'Please try again.'}`);
        hideLoading();
        resetDashboardView(); // Reset display on error
    });
}

function fetchPriceHistory(locationName, type, startDate = null, endDate = null) {
    let url = `/api/prices/${type}/${locationName}`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    return fetch(url)
        .then(response => {
             if (!response.ok) {
                  return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status} - ${err.error || response.statusText}`); }).catch(() => { throw new Error(`HTTP error! status: ${response.status}`); });
             }
             return response.json();
        })
        .catch(error => {
            console.error('Error fetching price history:', error);
            // Return empty data on error to allow other parts of the UI to load
            throw error; // Propagate error so the main Promise.all can catch it
        });
}

function fetchPredictionData(locationName, type) {
    // This API endpoint is expected to return latest price, calendar year prediction,
    // the full 24-month forecast, and derived dynamic averages.
    return fetch(`/api/predict/${type}/${locationName}`)
        .then(response => {
            if (!response.ok) {
                 return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status} - ${err.error || response.statusText}`); }).catch(() => { throw new Error(`HTTP error! status: ${response.status}`); });
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching prediction data:', error);
            // Provide a default structure on error to prevent breaking UI updates
            // Ensure structure matches successful response with empty/null data
            return {
               city_name_used_for_prediction: locationName, // Return the requested location name even on error
               latest_price_info: { price: null, date: null },
               full_24_month_forecast: [],
               next_calendar_year_prediction: { year: moment().year(), avg_price: null, predictions: [] },
               dynamic_averages_from_forecast: {
                  next_1_month_avg: null, next_3_months_avg: null, next_6_months_avg: null,
                  next_9_months_avg: null, next_12_months_avg: null, individual_next_12_months: []
               },
               distance_to_necc: null
            };
            // Note: We are now catching the error and returning a default structure
            // instead of throwing, to allow fetchDataForLocation's Promise.all to succeed
            // even if prediction fails for a specific location.
        });
}

function fetchAveragePrices(locationName, type) {
    return fetch(`/api/averages/${type}/${locationName}`)
        .then(response => {
             if (!response.ok) {
                  return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status} - ${err.error || response.statusText}`); }).catch(() => { throw new Error(`HTTP error! status: ${response.status}`); });
             }
             return response.json();
        })
        .catch(error => {
            console.error('Error fetching average prices:', error);
            // Return empty data on error
            throw error; // Propagate error
        });
}


function fetchAllPredictionsForConsolidatedTable() {
    showLoading("Fetching all city predictions for summary...");
    // Ensure neccCitiesForDropdown is populated before mapping
    if (!neccCitiesForDropdown || neccCitiesForDropdown.length === 0) {
         console.warn("NECC cities not loaded yet, cannot fetch all predictions.");
         // Try again later or alert? For now, just update the table to show loading state
         $('#consolidatedPredictionsTableBody').empty().append('<tr><td colspan="7" class="text-center">NECC cities list not available yet.</td></tr>');
         hideLoading();
         return;
    }

    const promises = neccCitiesForDropdown.map(city => {
        // Fetch prediction data for each NECC city using the updated API
        // Use catch here to prevent a single failed city from failing the whole Promise.all
        return fetchPredictionData(city, 'necc')
            .then(data => ({ name: city, ...data })) // Add city name to the data
            .catch(err => {
                console.warn(`Could not fetch prediction for consolidated table city ${city}: ${err.message || err}`);
                // Return a structure indicating failure for this city
                return {
                    name: city,
                    city_name_used_for_prediction: city,
                    latest_price_info: { price: null, date: null },
                    full_24_month_forecast: [],
                    next_calendar_year_prediction: { year: moment().year(), avg_price: null, predictions: [] },
                    dynamic_averages_from_forecast: {
                       next_1_month_avg: null, next_3_months_avg: null, next_6_months_avg: null,
                       next_9_months_avg: null, next_12_months_avg: null, individual_next_12_months: []
                    },
                    distance_to_necc: null
               };
            });
    });

    Promise.all(promises)
        .then(results => {
            consolidatedData = results.filter(r => r != null); // Keep all results, even those with empty data
            updateConsolidatedPredictionsTableDisplay();
            hideLoading();
        })
        .catch(error => {
            // This catch should ideally not be hit if individual promises catch their errors
            console.error("Error fetching all predictions for consolidated table:", error);
            alert("Could not load consolidated predictions summary. Some data may be missing.");
            hideLoading();
             // Update table to show error state
            $('#consolidatedPredictionsTableBody').empty().append('<tr><td colspan="7" class="text-center">Error loading data.</td></tr>');
        });
}


// --- UI UPDATE FUNCTIONS ---
// Added effectiveNeccCityName parameter to display in the message
function updateLocationInfo(locationName, type, distance, effectiveNeccCityName) {
    $('#selectedLocationName').text(locationName);
    const infoDiv = $('#selectedLocationInfo');
    const distanceSpan = $('#distanceToNecc');

    // Only show distance and associated city info if a district is selected and distance is available
    if (type === 'district' && distance !== null && distance !== undefined) {
         let message = `Associated NECC City is approx. ${distance.toFixed(1)} km away. `;
         if (effectiveNeccCityName && effectiveNeccCityName !== locationName) { // Ensure effective city is different from district name
              message += `Data shown is for ${effectiveNeccCityName}.`;
         } else {
              message += `Data shown is for the associated NECC city.`; // Fallback if name is not available or is the same
         }
        distanceSpan.text(message).show();
    } else {
        distanceSpan.hide(); // Hide if not a district or distance is missing
    }
    infoDiv.show(); // Always show the selected location name
}

function updateKeyMetricsDisplay(cityName, data) {
    // Use the actual city name for display, which might be the district name initially
    $('#latestPriceLocation').text(cityName);
    $('#latestPrice').text(data.latest_price_info && data.latest_price_info.price !== null && data.latest_price_info.price !== undefined ? `₹${parseFloat(data.latest_price_info.price).toFixed(2)}` : 'N/A');
    $('#latestPriceDate').text(data.latest_price_info && data.latest_price_info.date ? `Date: ${formatDisplayDate(data.latest_price_info.date)}` : 'Date: N/A');

    // Use dynamic averages for next 1 month and next 12 months avg from the derived data
    const dynamicAverages = data.dynamic_averages_from_forecast;

    $('#predictedNextMonthAvg').text(dynamicAverages?.next_1_month_avg !== null && dynamicAverages?.next_1_month_avg !== undefined ? `₹${parseFloat(dynamicAverages.next_1_month_avg).toFixed(2)}` : 'N/A');

    // The month label for the next month should be derived from the current date + 1 month
    // or from the first month in the individual_next_12_months list if available
    let nextMonthLabelText = 'Month: N/A';
    if (dynamicAverages?.individual_next_12_months && dynamicAverages.individual_next_12_months.length > 0) {
         const firstMonthData = dynamicAverages.individual_next_12_months[0];
         if (firstMonthData.month) {
             nextMonthLabelText = `Month: ${formatDisplayMonthYear(firstMonthData.month)}`;
         }
    }
    $('#predictedNextMonthLabel').text(nextMonthLabelText);


    $('#next12MonthAvgDisplay').text(dynamicAverages?.next_12_months_avg !== null && dynamicAverages?.next_12_months_avg !== undefined ? `Avg (Next 12M): ₹${parseFloat(dynamicAverages.next_12_months_avg).toFixed(2)}` : 'Avg (Next 12M): N/A');

    // Use the calendar year prediction average
    const calendarPrediction = data.next_calendar_year_prediction;
    $('#predictedCalendarYearAvg').text(calendarPrediction?.avg_price !== null && calendarPrediction?.avg_price !== undefined ? `₹${parseFloat(calendarPrediction.avg_price).toFixed(2)}` : 'N/A');
    $('#predictionCalendarYearLabel').text(calendarPrediction?.year ? `${calendarPrediction.year}` : 'Calendar Year'); // Display the actual predicted year
    $('#predictedCalendarYearSubLabel').text('Full Year Average');
}

function updateConsolidatedPredictionsTableDisplay() {
    const tableBody = $('#consolidatedPredictionsTableBody');
    tableBody.empty();

    if (!consolidatedData || consolidatedData.length === 0) {
        tableBody.append('<tr><td colspan="7" class="text-center">No prediction data available for any city.</td></tr>');
        return;
    }

    // Update calendar year header based on the first available city's prediction year
    // Find the first city with a valid calendar year prediction average
    const firstCityWithCalendarYearAvg = consolidatedData.find(cityData =>
        cityData.next_calendar_year_prediction?.avg_price !== null && cityData.next_calendar_year_prediction?.avg_price !== undefined
    );
    if (firstCityWithCalendarYearAvg?.next_calendar_year_prediction?.year) {
        $('#consolidatedPredictionsTable thead th').eq(6).text(`Avg (${firstCityWithCalendarYearAvg.next_calendar_year_prediction.year})`);
    } else {
        $('#consolidatedPredictionsTable thead th').eq(6).text(`Avg (Calendar Year)`);
    }


    consolidatedData.forEach(cityData => {
        const dynamicAverages = cityData.dynamic_averages_from_forecast || {};
        const calendarAvg = cityData.next_calendar_year_prediction?.avg_price;
        const cityNameForDisplay = cityData.name; // Use the original city name from the list

        const formatPrice = (price) => price !== null && price !== undefined ? `₹${parseFloat(price).toFixed(2)}` : 'N/A';

        const row = `
            <tr>
                <td>${cityNameForDisplay}</td>
                <td>${formatPrice(dynamicAverages.next_1_month_avg)}</td>
                <td>${formatPrice(dynamicAverages.next_3_months_avg)}</td>
                <td>${formatPrice(dynamicAverages.next_6_months_avg)}</td>
                <td>${formatPrice(dynamicAverages.next_9_months_avg)}</td>
                <td>${formatPrice(dynamicAverages.next_12_months_avg)}</td>
                <td>${formatPrice(calendarAvg)}</td>
            </tr>
        `;
        tableBody.append(row);
    });
}


// --- CHART RENDERING FUNCTIONS ---
function renderPriceTrendChart(prices, locationName) {
    if (priceTrendChart) {
        priceTrendChart.destroy();
    }
    const ctx = document.getElementById('priceTrendChart').getContext('2d');
    // Ensure the canvas element exists and is a canvas before getting context
     if (!ctx) {
         console.error("Could not get chart context for priceTrendChart");
         // Fallback to displaying message if canvas creation/context fails
         $('#trends-tab-pane .chart-container').html('<p class="text-center p-5">Error initializing chart.</p>');
         return;
     }

    if (!prices || prices.length === 0) {
        // Display a message if no data
        $(ctx.canvas).replaceWith('<canvas id="priceTrendChart"></canvas><p class="text-center text-muted small mt-2">No price trend data available for the last 5 years.</p>');
        return; // Exit function
    }
     // Restore canvas if it was replaced by a message
    if ($(ctx.canvas).prop("tagName") !== "CANVAS") {
         $('#trends-tab-pane .chart-container').find('p').remove(); // Remove message
         $('#trends-tab-pane .chart-container').append('<canvas id="priceTrendChart"></canvas>'); // Add canvas back
         ctx = document.getElementById('priceTrendChart').getContext('2d'); // Get new context
    }


    priceTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: prices.map(p => formatDisplayDate(p.date)), // Use formatted dates for labels
            datasets: [{
                label: `Price Trend for ${locationName} (Last 5 Years)`, // Updated label
                data: prices.map(p => p.price),
                borderColor: 'rgb(78, 115, 223)',
                backgroundColor: 'rgba(78, 115, 223, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'Price (₹)'} },
                x: {
                     type: 'time', // Use time scale
                     time: {
                        unit: 'month', // Display unit (can be 'day', 'week', 'month', 'year')
                         tooltipFormat: 'MMM D,YYYY', // Tooltip format
                        displayFormats: {
                            month: 'MMM YYYY',
                             year: 'YYYY'
                         }
                    },
                    title: { display: true, text: 'Date'}
                 }
            },
            plugins: { legend: { display: true } }
        }
    });
}


// Consolidated rendering function for Predictions tab content
function renderPredictionDataTab(cityName, predictionData, historicalMonthlyAverages) {
    // --- Prediction Summary Table (New Section) ---
    const summaryTableBody = $('#predictionSummaryTableBody'); // Assuming a new table with this ID in index.html
    summaryTableBody.empty();

    const dynamicAverages = predictionData.dynamic_averages_from_forecast || {};
    const calendarAvg = predictionData.next_calendar_year_prediction?.avg_price;

     // Ensure the table structure exists (this will be added in index.html)
     // For now, just populate if the element exists
     if (summaryTableBody.length) {
         const formatPrice = (price) => price !== null && price !== undefined ? `₹${parseFloat(price).toFixed(2)}` : 'N/A';
         const row = `
             <tr>
                 <td>${cityName}</td>
                 <td>${formatPrice(dynamicAverages.next_1_month_avg)}</td>
                 <td>${formatPrice(dynamicAverages.next_3_months_avg)}</td>
                 <td>${formatPrice(dynamicAverages.next_6_months_avg)}</td>
                 <td>${formatPrice(dynamicAverages.next_9_months_avg)}</td>
                 <td>${formatPrice(dynamicAverages.next_12_months_avg)}</td>
                 <td>${formatPrice(calendarAvg)}</td>
             </tr>
         `;
         summaryTableBody.append(row);
     } else {
         console.warn("Prediction summary table body element not found (#predictionSummaryTableBody).");
     }


    // --- 24-Month Monthly Predictions Table ---
    const monthlyTableBody = $('#predictionTable tbody'); // This is the existing table
    monthlyTableBody.empty();
    const full24MonthForecast = predictionData.full_24_month_forecast;


    if (!full24MonthForecast || full24MonthForecast.length === 0) {
        monthlyTableBody.append('<tr><td colspan="2" class="text-center">24-month prediction data not available.</td></tr>');
    } else {
        full24MonthForecast.forEach(pred => {
            const price = pred.price !== null && pred.price !== undefined ? `₹${parseFloat(pred.price).toFixed(2)}` : 'N/A';
            monthlyTableBody.append(`<tr><td>${formatDisplayMonthYear(pred.month)}</td><td>${price}</td></tr>`);
        });
    }

    // --- Prediction Chart ---
    if (predictionChart) {
        predictionChart.destroy();
    }
     const ctx = document.getElementById('predictionChart').getContext('2d');

     // Ensure the canvas element exists
     if (!ctx) {
         console.error("Could not get chart context for predictionChart");
         $('#predictions-tab-pane .chart-container:eq(1)').html('<p class="text-center p-5">Error initializing chart.</p>');
         $('#predictionChartTitle').text('Prediction Chart (Error)');
         return;
     }

     // Restore canvas if it was replaced by a message
     if ($(ctx.canvas).prop("tagName") !== "CANVAS") {
         $('#predictions-tab-pane .chart-container:eq(1)').find('p').remove(); // Remove message
         $('#predictions-tab-pane .chart-container:eq(1)').append('<canvas id="predictionChart"></canvas>'); // Add canvas back
         ctx = document.getElementById('predictionChart').getContext('2d'); // Get new context
     }


    // Format data for Chart.js time scale {x, y}
     const historicalDataForChart = (historicalMonthlyAverages || []) // Handle case where historical data might be null/undefined
        .filter(item => item.avg_price !== null && item.avg_price !== undefined)
        .map(item => ({
            x: moment(`${item.year}-${String(item.month).padStart(2,'0')}-01`).valueOf(), // Use Month Start timestamp
            y: item.avg_price
        }));

     const predictionDataForChart = (full24MonthForecast || []) // Handle case where forecast might be null/undefined
        .filter(pred => pred.price !== null && pred.price !== undefined)
        .map(pred => ({
            x: moment(pred.month, 'YYYY-MM').startOf('month').valueOf(), // Use Month Start timestamp
            y: pred.price
        }));

    // Combine historical and prediction datasets
    const datasets = [];

    if (historicalDataForChart.length > 0) {
         datasets.push({
             label: 'Historical Monthly Avg',
             data: historicalDataForChart,
             borderColor: 'rgb(75, 192, 192)',
             backgroundColor: 'rgba(75, 192, 192, 0.1)',
             fill: false,
             tension: 0.1,
             pointRadius: 3 // Show points for monthly data
         });
    }

    if (predictionDataForChart.length > 0) {
         datasets.push({
             label: 'Predicted Monthly Price',
             data: predictionDataForChart,
             borderColor: 'rgb(255, 99, 132)',
             backgroundColor: 'rgba(255, 99, 132, 0.1)',
             fill: true,
             tension: 0.1,
             pointRadius: 3 // Show points for monthly data
         });
    }

    // Determine chart title based on prediction data availability
    const chartTitle = predictionDataForChart.length > 0
        ? `Historical Monthly Averages vs. Predicted Monthly Prices`
        : `Prediction Chart`;
    $('#predictionChartTitle').text(chartTitle + ` for ${cityName}`);


    if (datasets.length === 0) {
        // If no historical or prediction data, display message
        $(ctx.canvas).replaceWith('<canvas id="predictionChart"></canvas><p class="text-center text-muted small mt-2">Historical and prediction data not available for charting.</p>');
         return;
    }


    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            // Labels are not strictly needed with time scale and object data {x, y}
            // but can sometimes help define the initial scale range if data is sparse.
            // Let Chart.js time scale handle the x-axis based on {x: timestamp}
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'Price (₹)'} },
                 x: {
                    type: 'time', // Use time scale
                    time: {
                        unit: 'month', // Display unit on axis
                         tooltipFormat: 'MMMYYYY', // Tooltip format
                        displayFormats: {
                            month: 'MMM YYYY' // Axis label format
                        }
                    },
                    title: { display: true, text: 'Month'}
                 }
            },
            plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}


function renderYearlyAverageChart(data, locationName) {
    if (yearlyAvgChart) {
        yearlyAvgChart.destroy();
    }
    const ctx = document.getElementById('yearlyAvgChart').getContext('2d');
     // Ensure the canvas element exists
     if (!ctx) {
         console.error("Could not get chart context for yearlyAvgChart");
         $('#averages-tab-pane .col-md-6:eq(0) .chart-container').html('<p class="text-center p-5">Error initializing chart.</p>');
         return;
     }


     if (!data || data.length === 0) {
        $(ctx.canvas).replaceWith('<canvas id="yearlyAvgChart"></canvas><p class="text-center p-5">No yearly average data available.</p>');
        return;
    }
     // Restore canvas if it was replaced by a message
    if ($(ctx.canvas).prop("tagName") !== "CANVAS") {
         $('#averages-tab-pane .col-md-6:eq(0) .chart-container').find('p').remove();
         $('#averages-tab-pane .col-md-6:eq(0) .chart-container').append('<canvas id="yearlyAvgChart"></canvas>');
         ctx = document.getElementById('yearlyAvgChart').getContext('2d');
    }

    yearlyAvgChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.year),
            datasets: [{
                label: `Yearly Average Price for ${locationName}`,
                data: data.map(item => item.avg_price),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, title: {display: true, text: 'Average Price (₹)'} },
         x: { title: { display: true, text: 'Year'}, type: 'category' } // Use category scale for years
        } }
    });
}

function renderMonthlyAverageChart(data, locationName) {
    if (monthlyAvgChart) {
        monthlyAvgChart.destroy();
    }
    const ctx = document.getElementById('monthlyAvgChart').getContext('2d');
    // Ensure the canvas element exists
     if (!ctx) {
         console.error("Could not get chart context for monthlyAvgChart");
         $('#averages-tab-pane .col-md-6:eq(1) .chart-container').html('<p class="text-center p-5">Error initializing chart.</p>');
         return;
     }

     if (!data || data.length === 0) {
        $(ctx.canvas).replaceWith('<canvas id="monthlyAvgChart"></canvas><p class="text-center p-5">No monthly average data available (Last 5 Years).</p>');
        return;
    }
     // Restore canvas if it was replaced by a message
    if ($(ctx.canvas).prop("tagName") !== "CANVAS") {
        $('#averages-tab-pane .col-md-6:eq(1) .chart-container').find('p').remove();
        $('#averages-tab-pane .col-md-6:eq(1) .chart-container').append('<canvas id="monthlyAvgChart"></canvas>');
        ctx = document.getElementById('monthlyAvgChart').getContext('2d');
    }


    // Format data for Chart.js time scale {x, y}
    const monthlyDataForChart = (data || [])
        .filter(item => item.avg_price !== null && item.avg_price !== undefined)
        .map(item => ({
            x: moment(`${item.year}-${String(item.month).padStart(2,'0')}-01`).valueOf(), // Use Month Start timestamp
            y: item.avg_price
        }));


    monthlyAvgChart = new Chart(ctx, {
        type: 'line',
        data: {
            // Labels are not strictly needed with time scale and object data {x, y}
            datasets: [{
                label: `Monthly Average Price (Last 5 Years) for ${locationName}`,
                data: monthlyDataForChart,
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgba(255, 159, 64, 0.1)',
                fill: true,
                tension: 0.1,
                 pointRadius: 3 // Show points for monthly data
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
             scales: {
                y: { beginAtZero: false, title: {display: true, text: 'Average Price (₹)'} },
                 x: {
                    type: 'time', // Use time scale
                    time: {
                        unit: 'month', // Display unit on axis
                         tooltipFormat: 'MMM YYYY', // Tooltip format
                        displayFormats: {
                            month: 'MMM YYYY' // Axis label format
                        }
                    },
                    title: { display: true, text: 'Month'}
                 }
             }
        }
    });
}

// --- MAP FUNCTIONS ---
function initializeMap() {
    if (priceMap) return; // Initialize only once

    // Use default view or try to center on India
    priceMap = L.map('priceMapContainer', { attributionControl: false }).setView([20.5937, 78.9629], 5); // India view
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    	subdomains: 'abcd',
    	maxZoom: 19
    }).addTo(priceMap);
    mapMarkersLayer = L.layerGroup().addTo(priceMap);

    // Fetch all NECC city locations and their latest prices for map markers
    fetch('/api/necc_cities_locations_prices')
        .then(response => {
             if (!response.ok) {
                  return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status} - ${err.error || response.statusText}`); }).catch(() => { throw new Error(`HTTP error! status: ${response.status}`); });
             }
             return response.json();
        })
        .then(citiesData => {
            mapMarkersLayer.clearLayers(); // Clear existing markers
            allMarkers = {}; // Reset stored markers

            citiesData.forEach(city => {
                if (city.latitude && city.longitude) {
                    const priceLevel = getPriceLevel(city.latest_price);
                    const markerColor = getMarkerColor(priceLevel);
                    const marker = L.circleMarker([city.latitude, city.longitude], {
                        radius: 8,
                        fillColor: markerColor,
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).bindPopup(`<b>${city.name}</b><br>Latest Price: ₹${city.latest_price ? parseFloat(city.latest_price).toFixed(2) : 'N/A'}`);

                    marker.on('click', function(e) {
                        // Trigger selection in the NECC city dropdown
                        $('#neccCitySelect').val(city.name).trigger('change');
                         // Optional: prevent default map click behavior if needed
                         L.DomEvent.stopPropagation(e);
                    });
                    mapMarkersLayer.addLayer(marker);
                    allMarkers[city.name] = marker; // Store marker reference
                    // Store price data on marker for easy access when de-highlighting
                    marker.priceData = city.latest_price;
                }
            });
        })
        .catch(error => console.error('Error fetching NECC city locations for map:', error));
}

function getPriceLevel(price) {
    if (price === null || price === undefined) return 'nodata';
    // Define thresholds based on your data distribution. Example thresholds, adjust as needed:
    // These thresholds should ideally be dynamic or based on percentiles of current prices
    // For now, using static example thresholds.
    if (price < 400) return 'low';
    if (price < 450) return 'medium-low';
    if (price < 500) return 'medium-high';
    return 'high'; // >= 500
}

function getMarkerColor(priceLevel) {
    switch (priceLevel) {
        case 'low': return '#28a745'; // Green (Success)
        case 'medium-low': return '#ffc107'; // Yellow (Warning)
        case 'medium-high': return '#fd7e14'; // Orange
        case 'high': return '#dc3545'; // Red (Danger)
        default: return '#6c757d'; // Grey (Secondary) for no data
    }
}

function fetchNearbyDistrictsForMap(neccCityName) {
    // This function expects the NECC city name directly
    if (!neccCityName) {
         console.warn("NECC city name not provided for fetchNearbyDistrictsForMap.");
         return Promise.resolve([]); // Return empty list if no city name
    }

    return fetch(`/api/nearby_districts/${neccCityName}`)
        .then(response => {
            if (!response.ok) {
                  return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status} - ${err.error || response.statusText}`); }).catch(() => { throw new Error(`HTTP error! status: ${response.status}`); });
             }
             return response.json();
        })
        .catch(error => {
            console.error(`Error fetching nearby districts for ${neccCityName}:`, error);
            // Return empty list on error
            return [];
        });
}

// Added effectiveNeccCityName parameter
function updateMapForSelectedLocation(locationName, type, nearbyDistricts, latestPrice, effectiveNeccCityName) {
    if (!priceMap) initializeMap(); // Ensure map is initialized

    // Clear previous highlights and lines
    activeLines.forEach(line => { if(priceMap.hasLayer(line)) priceMap.removeLayer(line); });
    activeLines = [];

    // Revert previous highlights to original style
    activeHighlights.forEach(hl => {
        if (hl && hl.setStyle) {
            // Use the price data stored on the marker to get the original color
            const originalColor = getMarkerColor(getPriceLevel(hl.priceData));
            hl.setStyle({ fillColor: originalColor, radius: 8, weight: 1 }); // Reset weight too
        }
    });
    activeHighlights = [];

    // Determine the NECC city to highlight and center the map on
    // Use the effectiveNeccCityName resolved by the backend
    let targetNeccCityName = effectiveNeccCityName;

     // If targetNeccCityName is null (e.g., district not mapped or error), try to use locationName if it's an NECC city
     if (!targetNeccCityName && type === 'necc') {
         targetNeccCityName = locationName;
     }

     // If we still don't have a target NECC city name, we cannot highlight a marker or show nearby districts
     if (!targetNeccCityName) {
         console.warn("Cannot update map: Target NECC city name not determined.");
         $('#nearbyDistrictsMapInfo').hide(); // Hide nearby districts info
         // Optionally center on a default location (like India) if no location is selected at all
         if ($('#selectedLocationName').text() === 'Selected City' || $('#selectedLocationInfo').css('display') === 'none') {
              if (priceMap) priceMap.setView([20.5937, 78.9629], 5);
         }
         return;
     }


    // Center map and highlight selected NECC city marker
    const selectedCityMarker = allMarkers[targetNeccCityName];
    if (selectedCityMarker) {
        priceMap.setView(selectedCityMarker.getLatLng(), 8); // Zoom to city location
        // Highlight style
        selectedCityMarker.setStyle({ fillColor: '#007bff', radius: 10, weight: 2 }); // Highlight selected city marker
        activeHighlights.push(selectedCityMarker);
         selectedCityMarker.priceData = latestPrice; // Store latest price on marker
        selectedCityMarker.openPopup(); // Open popup for selected city

        // Fetch and display nearby districts and draw lines only if an NECC city (or district mapped to one) is selected
        const nearbyList = $('#nearbyDistrictsList');
        nearbyList.empty();
        $('#nearbyDistrictsMapInfo').hide();


        if (nearbyDistricts && nearbyDistricts.length > 0) {
            $('#mapSelectedCity').text(targetNeccCityName); // The city for which nearby districts are shown
            const neccCityCoord = selectedCityMarker.getLatLng();

             nearbyDistricts.forEach(d => {
                 nearbyList.append(`<li>${d.rank}. ${d.district} (${d.distance} km)</li>`);
                 // Draw lines from the highlighted NECC city to nearby districts (if coords available)
                 const nearbyDistrictCoord = districtCoordinates[d.district];

                 if (neccCityCoord && nearbyDistrictCoord) {
                      const line = L.polyline([neccCityCoord, [nearbyDistrictCoord.lat, nearbyDistrictCoord.lon]], {color: 'red', dashArray: '5, 5', weight: 2}).addTo(priceMap);
                     activeLines.push(line);
                 } else {
                     console.warn(`Could not draw line: Coordinates missing for district ${d.district}`);
                 }
             });
             $('#nearbyDistrictsMapInfo').show();
        } else {
             console.info(`No nearby districts found for ${targetNeccCityName} or failed to fetch.`);
             $('#nearbyDistrictsMapInfo').hide(); // Ensure it's hidden if no data
        }


    } else {
         console.warn(`Marker not found for NECC city: ${targetNeccCityName}. Cannot highlight marker or show nearby districts.`);
         $('#nearbyDistrictsMapInfo').hide(); // Hide nearby info if NECC city marker isn't found

         // If marker not found, try centering based on static coordinates for the *initially selected* location
         if (districtCoordinates[locationName]) {
              priceMap.setView([districtCoordinates[locationName].lat, districtCoordinates[locationName].lon], 9);
         } else {
              console.warn(`Coordinates not found for ${locationName} to center map.`);
         }
    }
}


// --- DATE FILTER FUNCTIONS ---
function applyDateRangeFilter() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();
    const selectedDistrict = $('#districtSelect').val();
    const selectedNeccCity = $('#neccCitySelect').val();

    let locationName, type;
    if (selectedNeccCity) {
        locationName = selectedNeccCity;
        type = 'necc';
    } else if (selectedDistrict) {
        locationName = selectedDistrict;
        type = 'district';
    } else {
        alert("Please select a location first.");
        return;
    }

     // Validate date format if needed, or rely on input type="date"
     if (startDate && endDate && moment(startDate).isAfter(moment(endDate))) {
         alert("Start date cannot be after end date.");
         return;
     }
     // Also validate if both dates are provided or neither
     if ((startDate && !endDate) || (!startDate && endDate)) {
         alert("Please provide both start and end dates, or clear both.");
         return;
     }


    showLoading(`Applying date filter for ${locationName}...`);
    // Fetch price history for the specified range
    fetchPriceHistory(locationName, type, startDate, endDate)
        .then(data => {
            renderPriceTrendChart(data.prices, locationName); // Render chart with filtered data
            hideLoading();
        })
        .catch(error => {
            console.error("Error applying date filter:", error);
            alert("Could not apply date filter. " + error.message); // Display error message
            hideLoading();
             // Render chart with empty data on filter error
            renderPriceTrendChart([], locationName);
        });
}

function setDefaultDateRange(prices) {
    // This function is less relevant now as we fetch for a fixed 5-year window by default.
    // It can be used if we revert to showing full history by default.
    // Keeping it for potential future use or clarity.
    const startDateInput = $('#startDate');
    const endDateInput = $('#endDate');

    if (prices && prices.length > 0) {
        const firstDate = moment(prices[0].date);
        const lastDate = moment(prices[prices.length - 1].date);

        // Example: Set default to full range if data is available
        startDateInput.val(firstDate.format('YYYY-MM-DD'));
        endDateInput.val(lastDate.format('YYYY-MM-DD'));
    } else {
        // Clear dates if no price data
        startDateInput.val('');
        endDateInput.val('');
    }
}

function resetDateFiltersAndReload() {
    const selectedDistrict = $('#districtSelect').val();
    const selectedNeccCity = $('#neccCitySelect').val();
    let locationName, type;
    if (selectedNeccCity) {
        locationName = selectedNeccCity;
        type = 'necc';
    } else if (selectedDistrict) {
        locationName = selectedDistrict;
        type = 'district';
    } else {
        // Only reset date fields if no location selected
        $('#startDate').val('');
        $('#endDate').val('');
        // If no location selected, clear the trends chart
         renderPriceTrendChart([], "Selected City");
        return;
    }

    // Clear the date inputs visually
    $('#startDate').val('');
    $('#endDate').val('');


    showLoading(`Resetting date filter for ${locationName}...`);
    // Refetch price history using the default 5-year range logic
    const endDate = moment().format('YYYY-MM-DD');
    const startDate = moment().subtract(5, 'years').startOf('year').format('YYYY-MM-DD');

    fetchPriceHistory(locationName, type, startDate, endDate)
        .then(data => {
            renderPriceTrendChart(data.prices, locationName); // Render with default 5-year filtered view
            // setDefaultDateRange(data.prices); // Update date pickers to show the 5-year range
            $('#startDate').val(startDate);
            $('#endDate').val(endDate);
            hideLoading();
        })
        .catch(error => {
            console.error("Error resetting date filters:", error);
            alert("Could not reset date filters. " + error.message); // Display error message
            hideLoading();
             // Render chart with empty data on reset error
            renderPriceTrendChart([], locationName);
        });
}


// --- CITY COMPARISON FUNCTIONS ---
function populateCityComparisonSelect() {
    const select = $('#cityComparisonSelect');
    select.empty(); // Clear existing options
     // Add a disabled default option if desired
    select.append(new Option('Select up to 4 cities', '', false, true));

    neccCitiesForDropdown.forEach(city => {
        select.append(new Option(city, city));
    });
    // select.trigger('change'); // Notify Select2 of update - Select2 handles this on init
}

function handleCityComparisonChange() {
    const selectedCities = $('#cityComparisonSelect').val();
    if (!selectedCities || selectedCities.length === 0) {
         resetComparisonView();
         return;
    }
    if (selectedCities.length > MAX_COMPARE_CITIES) {
        alert(`Please select no more than ${MAX_COMPARE_CITIES} cities for comparison.`);
        // Trim the selection
        const currentSelection = $('#cityComparisonSelect').val();
        $('#cityComparisonSelect').val(currentSelection.slice(0, MAX_COMPARE_CITIES)).trigger('change.select2'); // Use change.select2 to notify Select2
        return; // Exit function after showing alert and trimming
    }


    $('#comparisonPrompt').hide();
    $('#comparisonChartsContainer').show();
    // Fetch data for comparison using the updated API
    fetchAllDataForComparison(selectedCities);

}

function resetComparisonView() {
    $('#comparisonPrompt').show();
    $('#comparisonChartsContainer').hide();
    if (comparisonTrendChart) {
        comparisonTrendChart.destroy();
        comparisonTrendChart = null;
    }
    if (comparisonPredictionChart) {
        comparisonPredictionChart.destroy();
        comparisonPredictionChart = null;
    }
    $('#comparisonTableBody').empty();
     // Clear Select2 selection visually and internally
     $('#cityComparisonSelect').val(null).trigger('change.select2');
      // Reset chart titles
     $('#comparisonPredictionChartTitle').text('Calendar Year Prediction Comparison');
}

function fetchAllDataForComparison(cities) {
    showLoading("Loading comparison data...");

    // Fetch historical data for trends comparison
    const trendPromises = cities.map(city =>
        fetchPriceHistory(city, 'necc').catch(error => {
            console.error(`Error fetching history for comparison city ${city}:`, error.message || error);
            return { city, prices: [] }; // Return empty data on error
        })
    );

    // Fetch prediction data for prediction comparison (uses the updated API endpoint)
    const predictionPromises = cities.map(city =>
        fetchPredictionData(city, 'necc').catch(error => {
            console.error(`Error fetching prediction for comparison city ${city}:`, error.message || error);
            // Return structure matching the expected successful response, but with empty/null data
            return {
                city_name_used_for_prediction: city,
                latest_price_info: { price: null, date: null },
                full_24_month_forecast: [],
                next_calendar_year_prediction: { year: moment().year(), avg_price: null, predictions: [] },
                dynamic_averages_from_forecast: {
                   next_1_month_avg: null, next_3_months_avg: null, next_6_months_avg: null,
                   next_9_months_avg: null, next_12_months_avg: null, individual_next_12_months: []
                },
                distance_to_necc: null
            };
        })
    );

    Promise.all([Promise.all(trendPromises), Promise.all(predictionPromises)])
        .then(([trendResults, predictionResults]) => {

            // Map results to include city name if not already present
            const trends = trendResults.map((data, index) => ({ city: cities[index], prices: data.prices || [] }));
            const predictions = predictionResults.map((data, index) => ({ city: cities[index], ...data }));

            renderComparisonTrendChart(trends);
            renderComparisonPredictionChart(predictions);
            populateComparisonTable(predictions);
            hideLoading();
        })
        .catch(error => {
            console.error("Error fetching comparison data:", error);
            alert("Failed to load comparison data. " + error.message); // Display error message
            resetComparisonView(); // Reset on error
            hideLoading();
        });
}


function renderComparisonTrendChart(cityTrendData) {
    if (comparisonTrendChart) {
        comparisonTrendChart.destroy();
    }
    const ctx = document.getElementById('comparisonTrendChart').getContext('2d');
     // Ensure the canvas element exists
     if (!ctx) {
          console.error("Could not get chart context for comparisonTrendChart");
         $('#comparisonChartsContainer .col-lg-6:eq(0) .chart-container').html('<p class="text-center p-5">Error initializing chart.</p>');
          return;
     }

     // Restore canvas if it was replaced by a message
     if ($(ctx.canvas).prop("tagName") !== "CANVAS") {
         $('#comparisonChartsContainer .col-lg-6:eq(0) .chart-container').find('p').remove(); // Remove message
         $('#comparisonChartsContainer .col-lg-6:eq(0) .chart-container').append('<canvas id="comparisonTrendChart"></canvas>'); // Add canvas back
         ctx = document.getElementById('comparisonTrendChart').getContext('2d'); // Get new context
     }


    // Use the last 1 year of data for each city for consistency if available
    const comparisonPeriodInDays = 365;

    const datasets = cityTrendData.map((data, index) => {
        // Filter and map to {x: timestamp, y: price}, handling missing data
        const cityPricesData = (data.prices || [])
            .filter(p => p.price !== null && p.price !== undefined)
            .map(p => ({
                x: moment(p.date).valueOf(), // Use date timestamp
                y: p.price
            }));

        // Get the last `comparisonPeriodInDays` data points if available
        const recentCityPricesData = cityPricesData.slice(-comparisonPeriodInDays);


        return {
            label: data.city,
            data: recentCityPricesData, // Use the potentially sliced data
            borderColor: comparisonColors[index % comparisonColors.length],
            fill: false,
            tension: 0.1,
            pointRadius: 0 // Don't show points for dense daily data
        };
    }).filter(dataset => dataset.data.length > 0); // Only include datasets with data

    if (datasets.length === 0) {
         $(ctx.canvas).replaceWith('<canvas id="comparisonTrendChart"></canvas><p class="text-center p-5">No historical trend data available for comparison.</p>');
         return;
    }


    comparisonTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            // Using object data format ({x, y}), labels array is less critical but can be provided
            // Let Chart.js time scale handle mapping x values directly.
             datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'Price (₹)' } },
                x: {
                    type: 'time', // Use time scale
                    time: {
                        unit: 'month', // Display format on axis
                         tooltipFormat: 'MMM D, YYYY', // Tooltip format
                         displayFormats: {
                            month: 'MMM YYYY',
                            day: 'MMM D, YY' // For closer zoom levels
                         }
                    },
                    title: { display: true, text: 'Date'}
                 }
            },
            plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }
        }
    });
}

function renderComparisonPredictionChart(cityPredictionData) {
    if (comparisonPredictionChart) {
        comparisonPredictionChart.destroy();
    }
    const ctx = document.getElementById('comparisonPredictionChart').getContext('2d');

    // Ensure the canvas element exists
     if (!ctx) {
         console.error("Could not get chart context for comparisonPredictionChart");
         $('#comparisonChartsContainer .col-lg-6:eq(1) .chart-container').html('<p class="text-center p-5">Error initializing chart.</p>');
         $('#comparisonPredictionChartTitle').text('Calendar Year Prediction Comparison (Error)');
         return;
     }
     // Restore canvas if it was replaced by a message
     if ($(ctx.canvas).prop("tagName") !== "CANVAS") {
         $('#comparisonChartsContainer .col-lg-6:eq(1) .chart-container').find('p').remove();
         $('#comparisonChartsContainer .col-lg-6:eq(1)').append('<canvas id="comparisonPredictionChart"></canvas>');
         ctx = document.getElementById('comparisonPredictionChart').getContext('2d');
     }


    // Use the Calendar Year Prediction (first 12 months of 24-month forecast) for comparison
    const datasets = cityPredictionData.map((data, index) => {
        // next_calendar_year_prediction now contains the first 12 months breakdown
        const calendarYearPredictions = data.next_calendar_year_prediction?.predictions || [];

        // Filter and map to {x: timestamp, y: price}, handling missing data
        const predictionDataForChart = calendarYearPredictions
            .filter(p => p.price !== null && p.price !== undefined)
            .map(p => ({
                x: moment(p.month, 'YYYY-MM').startOf('month').valueOf(), // Use Month Start timestamp
                y: p.price
            }));


        return {
            label: data.city_name_used_for_prediction || data.name || `City ${index + 1}`, // Use effective city name if available
            data: predictionDataForChart,
            borderColor: comparisonColors[index % comparisonColors.length],
            fill: false,
            tension: 0.1,
             pointRadius: 3 // Show points for monthly data
        };
    }).filter(dataset => dataset.data.length > 0); // Only include datasets with data

     if (!datasets || datasets.length === 0) {
         $(ctx.canvas).replaceWith('<canvas id="comparisonPredictionChart"></canvas><p class="text-center p-5">No calendar year prediction data available for comparison.</p>');
         $('#comparisonPredictionChartTitle').text('Calendar Year Prediction Comparison (Data Not Available)');
         populateComparisonTable([]); // Ensure table is cleared/shows no data message
         return;
     }


     // Determine the common year if all predictions are for the same year for chart title
     let commonYear = null;
     let allSameYear = true;
     if (cityPredictionData && cityPredictionData.length > 0) {
         commonYear = cityPredictionData[0].next_calendar_year_prediction?.year;
         for (let i = 1; i < cityPredictionData.length; i++) {
             if (cityPredictionData[i].next_calendar_year_prediction?.year !== commonYear) {
                 allSameYear = false;
                 break;
             }
         }
     }

     // Update chart title to reflect the comparison year(s)
     const comparisonChartTitle = (commonYear !== null && commonYear !== undefined && allSameYear)
        ? `Predicted Monthly Prices Comparison (${commonYear})`
        : `Predicted Monthly Prices Comparison`;
    $('#comparisonPredictionChartTitle').text(comparisonChartTitle);


    comparisonPredictionChart = new Chart(ctx, {
        type: 'line',
        data: {
             datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'Predicted Price (₹)' } },
                 x: {
                    type: 'time', // Use time scale
                    time: {
                        unit: 'month', // Display unit
                         tooltipFormat: 'MMM YYYY', // Tooltip format
                        displayFormats: {
                            month: 'MMM YYYY' // Axis label format
                        }
                    },
                    title: { display: true, text: 'Month'}
                 }
            },
            plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }
        }
    });
}

function populateComparisonTable(cityPredictionData) {
    const tableBody = $('#comparisonTableBody');
    tableBody.empty();

     // Filter for cities that have calendar year prediction data
     const citiesWithPredictionData = cityPredictionData.filter(data =>
         data.next_calendar_year_prediction?.predictions && data.next_calendar_year_prediction.predictions.length > 0
     );

     if (!citiesWithPredictionData || citiesWithPredictionData.length === 0) {
         tableBody.append('<tr><td colspan="4" class="text-center">No calendar year prediction data available for comparison.</td></tr>');
         return;
     }

    citiesWithPredictionData.forEach(data => {
        // Use the Calendar Year Prediction part (first 12 months of 24-month forecast)
        const calendarPred = data.next_calendar_year_prediction;
        const avgPrice = calendarPred?.avg_price !== null && calendarPred?.avg_price !== undefined ? `₹${parseFloat(calendarPred.avg_price).toFixed(2)}` : 'N/A';
        const cityNameForDisplay = data.city_name_used_for_prediction || data.name || 'N/A'; // Use effective city name

        let minPrice = 'N/A', maxPrice = 'N/A';
        if (calendarPred && calendarPred.predictions && calendarPred.predictions.length > 0) {
            const prices = calendarPred.predictions.map(p => p.price).filter(p => p !== null && p !== undefined);
            if (prices.length > 0) {
                minPrice = `₹${Math.min(...prices).toFixed(2)}`;
                maxPrice = `₹${Math.max(...prices).toFixed(2)}`;
            }
        }

        const row = `
            <tr>
                <td>${cityNameForDisplay}</td>
                <td>${avgPrice}</td>
                <td>${minPrice}</td>
                <td>${maxPrice}</td>
            </tr>
        `;
        tableBody.append(row);
    });
}


// --- UTILITY FUNCTIONS ---
function formatDisplayDate(dateString) {
     // Ensure input is treated as UTC or explicitly in the server's timezone if necessary
     // Assuming backend dates are YYYY-MM-DD format and can be parsed directly
     // Use moment.utc() if backend dates are UTC, otherwise moment() or specify format
     const date = moment.utc(dateString, 'YYYY-MM-DD'); // Assuming YYYY-MM-DD from backend
     return date.isValid() ? date.format('MMM D, YYYY') : dateString; // e.g., May 11, 2025
}

function formatDisplayMonthYear(dateString) {
     // Ensure input is parsed correctly, handling potential 'YYYY-MM' or full date string
     // Use utc() to prevent timezone issues if dates are interpreted differently
     const date = moment.utc(dateString, ["YYYY-MM-DDTHH:mm:ssZ", "YYYY-MM-DD", "YYYY-MM"]);
     return date.isValid() ? date.format('MMM YYYY') : dateString; // e.g., May 2025
}

// Function to format dates specifically for Chart.js time scale x-axis if needed
// This is often redundant if using {x: timestamp} format for data points,
// as Chart.js time scale handles parsing directly.
// Kept for clarity or if labels array is used.
function formatMonthYearForChart(dateString) {
     const date = moment.utc(dateString, ["YYYY-MM-DDTHH:mm:ssZ", "YYYY-MM-DD", "YYYY-MM"]);
     return date.isValid() ? date.format('YYYY-MM') : dateString; // Use a consistent parseable format for Chart.js
}


function resetTabsToDefault() {
    // Deactivate all tabs and panes
    $('#dataTab .nav-link').removeClass('active').attr('aria-selected', 'false');
    $('#dataTabContent .tab-pane').removeClass('show active');

    // Activate the first tab (Trends)
    $('#trends-tab').addClass('active').attr('aria-selected', 'true');
    $('#trends-tab-pane').addClass('show active');
    localStorage.setItem('activeTab', 'trends-tab');
}

// Reset the entire dashboard view to its initial state (no location selected)
function resetDashboardView() {
     $('#selectedLocationInfo').hide();
     $('#selectedLocationName').text('');
     $('#distanceToNecc').hide();
     $('#dynamicLocationName').text('Selected City');

     // Clear key metrics
     $('#latestPriceLocation').text('N/A');
     $('#latestPrice').text('N/A');
     $('#latestPriceDate').text('Date: N/A');
     $('#predictedNextMonthAvg').text('N/A');
     $('#predictedNextMonthLabel').text('Month: N/A');
     $('#next12MonthAvgDisplay').text('Avg (Next 12M): N/A');
     $('#predictedCalendarYearAvg').text('N/A');
     $('#predictionCalendarYearLabel').text('Calendar Year');
     $('#predictedCalendarYearSubLabel').text('Full Year Average');


     // Destroy existing charts and clear their containers
     if (priceTrendChart) { priceTrendChart.destroy(); priceTrendChart = null; }
      $('#trends-tab-pane .chart-container').html('<canvas id="priceTrendChart"></canvas>'); // Restore canvas
      $('#trends-tab-pane .chart-container').find('p').remove(); // Remove message

     if (predictionChart) { predictionChart.destroy(); predictionChart = null; }
      $('#predictions-tab-pane .chart-container:eq(1)').html('<canvas id="predictionChart"></canvas>'); // Restore canvas
      $('#predictions-tab-pane .chart-container:eq(1)').find('p').remove(); // Remove message
      $('#predictionChartTitle').text('Prediction Chart'); // Reset title

     if (yearlyAvgChart) { yearlyAvgChart.destroy(); yearlyAvgChart = null; }
      $('#averages-tab-pane .col-md-6:eq(0) .chart-container').html('<canvas id="yearlyAvgChart"></canvas>'); // Restore canvas
      $('#averages-tab-pane .col-md-6:eq(0) .chart-container').find('p').remove(); // Remove message

     if (monthlyAvgChart) { monthlyAvgChart.destroy(); monthlyAvgChart = null; }
      $('#averages-tab-pane .col-md-6:eq(1) .chart-container').html('<canvas id="monthlyAvgChart"></canvas>'); // Restore canvas
      $('#averages-tab-pane .col-md-6:eq(1) .chart-container').find('p').remove(); // Remove message


     // Clear tables
     $('#predictionTable tbody').empty().append('<tr><td colspan="2" class="text-center">Select a location to view data.</td></tr>');
     // Clear prediction summary table body if it exists (will add in index.html)
     const predictionSummaryTableBody = $('#predictionSummaryTableBody');
     if (predictionSummaryTableBody.length) {
         predictionSummaryTableBody.empty().append('<tr><td colspan="7" class="text-center">Select a location to view summary.</td></tr>');
     }

     // Keep consolidated data, but clear the display table body
     $('#consolidatedPredictionsTableBody').empty().append('<tr><td colspan="7" class="text-center">Loading consolidated data...</td></tr>');
      // Refetch consolidated data if it's empty or stale (optional, initial fetch should cover it)
     if (consolidatedData.length === 0) {
         fetchAllPredictionsForConsolidatedTable();
     } else {
          // If data exists, just re-render the table to show it's loaded
          updateConsolidatedPredictionsTableDisplay();
     }


     $('#comparisonTableBody').empty(); // Clear comparison table


     // Reset date filters visually
     $('#startDate').val('');
     $('#endDate').val('');

     // Reset map and nearby districts info
     if (priceMap) {
          // Clear highlights and lines
          activeHighlights.forEach(hl => {
               if (hl && hl.setStyle) {
                    const originalColor = getMarkerColor(getPriceLevel(hl.priceData));
                    hl.setStyle({ fillColor: originalColor, radius: 8, weight: 1 }); // Reset style
               }
          });
          activeHighlights = [];
          activeLines.forEach(line => { if(priceMap.hasLayer(line)) priceMap.removeLayer(line); });
          activeLines = [];

           // Center map on India
          priceMap.setView([20.5937, 78.9629], 5);
     }
     $('#nearbyDistrictsMapInfo').hide();
     $('#nearbyDistrictsList').empty();
     $('#mapSelectedCity').text('');


     // Reset Select2 dropdowns visually
     $('#districtSelect').val(null).trigger('change.select2');
     $('#neccCitySelect').val(null).trigger('change.select2');


    // Reset comparison modal view
    resetComparisonView();

    // Reset tab display to default
    resetTabsToDefault();

    // Hide loader if it was somehow stuck
    hideLoading();

}


// Helper function to safely destroy charts
function destroyChart(chartInstance) {
    if (chartInstance) {
        chartInstance.destroy();
    }
    // Do not set the instance variable to null here,
    // let the calling function manage its chart variable.
}