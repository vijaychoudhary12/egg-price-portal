# app.py
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date as date_type
from dateutil.relativedelta import relativedelta
from flask import Flask, jsonify, request, render_template
from flask_caching import Cache
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import logging
import warnings
import pytz
import os

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning, module='statsmodels')

# --- Configuration ---
CONFIG = {
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 3600, # Cache results for 1 hour
    "NECC_PRICES_DB": "necc_prices.db", # Contains DailyPrices table
    "NEAREST_NECC_DB": "nearest_necc.db", # Contains district_necc_map, necc_top_districts, necc_city_coordinates
    "TIMEZONE": "Asia/Kolkata",
    "DATE_FORMAT": "%Y-%m-%d",
    # Min months of *monthly aggregated* data required for a stable monthly HW model
    # 2 cycles of seasonality (2*12) + some for trend/initialization, adjusted based on typical data availability
    # Increased requirement slightly for robustness based on common practice and potential data variability
    "MIN_MONTHS_DATA_FOR_MONTHLY_HW": 36, # Increased from 30 to 36 months (3 full years)
    "HW_TREND": "add",
    "HW_SEASONAL_MONTHLY": "mul", # Use multiplicative seasonality for monthly data
    "HW_SEASONAL_PERIODS_MONTHLY": 12, # Yearly seasonality for monthly data
}

# --- Flask App Setup ---
app = Flask(__name__)
app.config.from_mapping(CONFIG)
cache = Cache(app)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Database Helper Functions ---
def get_db_connection(db_name_key):
    db_path = app.config[db_name_key]
    if not os.path.exists(db_path):
        logger.critical(f"Database file not found: {db_path}")
        # Depending on deployment, you might want to raise an exception or handle this differently
        raise FileNotFoundError(f"Database file not found: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def get_associated_necc_city(district_name):
    """Fetches the NECC city associated with a given district."""
    if not district_name:
        return None, None
    try:
        conn = get_db_connection("NEAREST_NECC_DB")
        cursor = conn.cursor()
        # Assuming 'district_necc_map' table with 'district', 'necc_city', 'distance'
        cursor.execute("SELECT necc_city, distance FROM district_necc_map WHERE district = ?", (district_name,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return row['necc_city'], row['distance']
        return None, None
    except Exception as e: # Catching broader Exception for DB errors
        logger.error(f"Database error fetching associated NECC city for {district_name}: {e}")
        return None, None

def get_city_coordinates_db(city_name):
    """Fetches coordinates for a given NECC city from the database."""
    if not city_name:
        return None
    try:
        conn = get_db_connection("NEAREST_NECC_DB")
        cursor = conn.cursor()
        # Assuming 'necc_city_coordinates' table with 'city', 'latitude', 'longitude'
        cursor.execute("SELECT latitude, longitude FROM necc_city_coordinates WHERE city = ?", (city_name,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {"latitude": row['latitude'], "longitude": row['longitude']}
        return None
    except Exception as e:
        logger.error(f"Database error fetching coordinates for {city_name}: {e}")
        return None

# --- Core Data Fetching & Processing (with Caching) ---

@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"])
def get_historical_daily_prices_df(city_name, start_date_str=None, end_date_str=None):
    logger.info(f"Fetching historical DAILY prices for {city_name} from DB. Dates: {start_date_str} to {end_date_str}")
    try:
        conn = get_db_connection("NECC_PRICES_DB")
        query = "SELECT Date, Price FROM DailyPrices WHERE City = ?"
        params = [city_name]
        if start_date_str:
            query += " AND Date >= ?"
            params.append(start_date_str)
        if end_date_str:
            query += " AND Date <= ?"
            params.append(end_date_str)
        query += " ORDER BY Date ASC"

        df = pd.read_sql_query(query, conn, params=params)
        conn.close()

        if df.empty:
            logger.warning(f"No historical daily prices found for {city_name} for dates {start_date_str} to {end_date_str}.")
            return pd.DataFrame(columns=['Date', 'Price'])

        df['Date'] = pd.to_datetime(df['Date'])
        # Ensure all dates are at the start of the day for consistent indexing
        df['Date'] = df['Date'].dt.normalize()
        df.set_index('Date', inplace=True)
        df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
        df.dropna(subset=['Price'], inplace=True)

        # Ensure the index is a DatetimeIndex
        df.index = pd.to_datetime(df.index)

        return df
    except Exception as e:
        logger.error(f"Database error fetching daily prices for {city_name}: {e}")
        return pd.DataFrame(columns=['Date', 'Price'])


# Helper to get historical monthly averages up to a specific date
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"])
def get_historical_monthly_avg_up_to_date_df(city_name, end_date):
    """
    Calculates historical MONTHLY averages for a city up to a given end date.
    end_date should be a datetime.date or pandas Timestamp.
    Returns a pandas Series with Month Start index.
    Returns empty Series if no data.
    """
    logger.info(f"Calculating historical MONTHLY averages for {city_name} up to {end_date}.")
    # Fetch all daily prices first
    daily_df = get_historical_daily_prices_df(city_name)
    if daily_df.empty:
        logger.warning(f"No daily data available to calculate monthly averages for {city_name}.")
        return pd.Series(name="Price", dtype=float)

    # Filter daily data up to the end date (inclusive of the entire end_date's day)
    # Convert end_date to Timestamp if it's a date object, and ensure it's end of day for filtering
    if isinstance(end_date, date_type):
         end_date_ts = pd.Timestamp(end_date) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
    else: # Assume it's already a Timestamp, ensure it's end of day
         end_date_ts = pd.Timestamp(end_date) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)


    daily_df_filtered = daily_df[daily_df.index <= end_date_ts]


    if daily_df_filtered.empty:
         logger.warning(f"No daily data found up to {end_date} after filtering for {city_name}.")
         return pd.Series(name="Price", dtype=float)

    # Resample to monthly start and calculate mean
    # Use .mean() method which handles NaNs correctly
    monthly_avg = daily_df_filtered['Price'].resample('MS').mean().dropna()

    return monthly_avg


@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"])
def get_latest_price_info_db(city_name):
    logger.info(f"Fetching latest price for {city_name} from DB.")
    try:
        conn = get_db_connection("NECC_PRICES_DB")
        cursor = conn.cursor()
        cursor.execute("SELECT Date, Price FROM DailyPrices WHERE City = ? ORDER BY Date DESC LIMIT 1", (city_name,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {"date": row['Date'], "price": float(row['Price']) if row['Price'] is not None else None}
        return {"date": None, "price": None}
    except Exception as e:
        logger.error(f"Database error fetching latest price for {city_name}: {e}")
        return {"date": None, "price": None}

# --- Prediction Engine (Enhanced) ---

@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"])
def generate_24_month_forecast(city_name, current_system_date):
    """
    Generates a 24-month forecast (monthly) using HW model trained on data
    up to the end of the year preceding the current_system_date's year.
    Forecast starts from the beginning of the current_system_date's year.
    Returns a list of dictionaries: [{"month": "YYYY-MM", "price": price}].
    Returns empty list if prediction is not possible due to insufficient data.
    """
    logger.info(f"Generating 24-month forecast for {city_name}. Current system date: {current_system_date}")

    # Determine the end date for training data: end of the year before the current year
    training_end_date = datetime(current_system_date.year - 1, 12, 31).date()
    training_end_timestamp = pd.Timestamp(training_end_date)

    # Get historical monthly averages up to the training end date
    historical_monthly_data = get_historical_monthly_avg_up_to_date_df(city_name, training_end_timestamp)

    # Check if sufficient data exists for robust HW model
    # Need at least MIN_MONTHS_DATA_FOR_MONTHLY_HW months of data
    if historical_monthly_data.empty or len(historical_monthly_data) < CONFIG["MIN_MONTHS_DATA_FOR_MONTHLY_HW"]:
        logger.warning(f"Not enough historical monthly data ({len(historical_monthly_data)} months) "
                       f"up to {training_end_date} for {city_name} to generate a 24-month forecast. "
                       f"Minimum required: {CONFIG['MIN_MONTHS_DATA_FOR_MONTHLY_HW']} months.")
        return [] # Return empty list if insufficient data

    try:
        # Fit the Holt-Winters model
        model = ExponentialSmoothing(
            historical_monthly_data,
            trend=CONFIG["HW_TREND"],
            seasonal=CONFIG["HW_SEASONAL_MONTHLY"], # Use monthly seasonal config
            seasonal_periods=CONFIG["HW_SEASONAL_PERIODS_MONTHLY"], # Use monthly seasonal periods
            initialization_method='estimated'
        ).fit()

        # Forecast for next 24 months (periods)
        forecast_steps = 24
        future_predictions_series = model.forecast(forecast_steps) # This returns a pandas Series with DatetimeIndex

        # Format predictions into list of dicts
        predicted_data_list = []
        # Iterate over the Series index (pandas Timestamps) and values
        for date_index, price in future_predictions_series.items():
             # Ensure date_index is treated as a Timestamp
             date_ts = pd.Timestamp(date_index)
             predicted_data_list.append({
                 # Format date using strftime
                 "month": date_ts.strftime('%Y-%m'),
                 "price": round(price, 2) if pd.notna(price) else None
             })

        return predicted_data_list

    except Exception as e:
        logger.error(f"Error generating 24-month HW forecast for {city_name}: {e}")
        return [] # Return empty list on error


def calculate_dynamic_averages_from_forecast(forecast_data_list, current_system_date):
    """
    Calculates dynamic averages (1M, 3M, 6M, 9M, 12M) from a list of monthly forecast data,
    starting from the month *after* the current_system_date.
    forecast_data_list is expected to be a list of dicts: [{"month": "YYYY-MM", "price": price}, ...]
    Returns a dict with average values and individual next 12 months (from current+1).
    Returns dict with None/empty values if prediction data is not available or processing fails.
    """
    logger.info(f"Calculating dynamic averages from forecast data. Current date: {current_system_date}.")

    results = {
        "next_1_month_avg": None, "next_3_months_avg": None,
        "next_6_months_avg": None, "next_9_months_avg": None,
        "next_12_months_avg": None,
        "individual_next_12_months": [] # List of monthly predictions for the next 12 months starting from current+1
    }

    if not forecast_data_list:
        logger.warning("No forecast data list provided for dynamic average calculation.")
        return results

    # Convert forecast list to DataFrame for easier date-based slicing
    forecast_df = pd.DataFrame(forecast_data_list)
    try:
        # Convert 'month' column to datetime objects (Month Start) and set as index
        forecast_df['month'] = pd.to_datetime(forecast_df['month'], format='%Y-%m')
        forecast_df = forecast_df.set_index('month')
        # Ensure index is explicitly a DatetimeIndex
        forecast_df.index = pd.to_datetime(forecast_df.index)
        forecast_df['price'] = pd.to_numeric(forecast_df['price'], errors='coerce')
         # Drop rows where price is NaN after conversion - important for averaging
        forecast_df.dropna(subset=['price'], inplace=True)

        if forecast_df.empty:
            logger.warning("Forecast DataFrame is empty after processing for dynamic averages.")
            return results

    except Exception as e:
        logger.error(f"Error processing forecast data list into DataFrame for dynamic averages: {e}")
        return results


    # Determine the start month for dynamic averages (the month after the current month)
    # Use MonthBegin to get the start of the next month correctly relative to the current system date
    # Ensure current_system_date is treated as a Timestamp for calculations
    current_date_ts = pd.Timestamp(current_system_date)
    dynamic_avg_start_month_ts = current_date_ts + pd.offsets.MonthBegin(1)


    periods_in_months = [1, 3, 6, 9, 12]
    months_to_collect_individual = 12 # We need the next 12 individual months starting from dynamic_avg_start_month_ts

    for p_months in periods_in_months:
        # Calculate the end month for this period (inclusive) starting from dynamic_avg_start_month_ts
        dynamic_avg_end_month_ts = dynamic_avg_start_month_ts + pd.offsets.MonthEnd(p_months - 1)

        # Filter the forecast DataFrame for this period using the DatetimeIndex
        # Use .loc for label-based slicing on the DatetimeIndex
        # Need to get the forecast data from the start of the dynamic average period
        relevant_forecast_months = forecast_df.loc[
            (forecast_df.index >= dynamic_avg_start_month_ts) &
            (forecast_df.index <= dynamic_avg_end_month_ts)
        ]

        if not relevant_forecast_months.empty and not relevant_forecast_months['price'].isna().all():
            # Calculate mean of non-null prices in this period
            results[f"next_{p_months}_month{'s' if p_months > 1 else ''}_avg"] = round(relevant_forecast_months['price'].mean(), 2)
        else:
            # logger.warning(f"No valid forecast data found for next {p_months} months starting from {dynamic_avg_start_month_ts.strftime('%Y-%m')}")
            pass # Keep the average as None if no data


    # Collect individual predictions for the next 12 months starting from dynamic_avg_start_month_ts
    try:
        # Find the start position in the forecast_df index that is >= dynamic_avg_start_month_ts
        # searchsorted finds the index where the dynamic_avg_start_month_ts could be inserted to maintain order
        start_pos_idx = forecast_df.index.searchsorted(dynamic_avg_start_month_ts, side='left')

        # Slice the DataFrame from the start position for the next 12 months using iloc (integer-based)
        individual_months_df = forecast_df.iloc[start_pos_idx : start_pos_idx + months_to_collect_individual]

        results["individual_next_12_months"] = [
            {"month": idx.strftime('%Y-%m'), "price": row['price'] if pd.notna(row['price']) else None}
            for idx, row in individual_months_df.iterrows()
        ]
    except Exception as e:
         logger.error(f"Error slicing forecast data for individual next 12 months: {e}")
         results["individual_next_12_months"] = []


    return results


# --- API Endpoints ---
@app.route('/')
def index():
    # This can serve your main index.html if you place it in a 'templates' folder
    # For a pure API backend, this might not be needed or could be a status page.
    # return jsonify({"status": "Egg Price API is running"})
    # Ensure index.html is in a 'templates' folder
    try:
        return render_template("index.html")
    except Exception as e:
        logger.error(f"Error rendering index.html: {e}")
        return "Error loading page.", 500


@app.route('/api/predict/<type>/<path:location_name>')
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"]) # Cache the entire endpoint result
def get_all_predictions(type, location_name):
    logger.info(f"Received prediction request for type: {type}, location: {location_name}")
    effective_city_name = location_name
    distance_to_necc = None

    if type == 'district':
        necc_city_tuple = get_associated_necc_city(location_name)
        if necc_city_tuple and necc_city_tuple[0]:
            effective_city_name = necc_city_tuple[0]
            distance_to_necc = necc_city_tuple[1]
            logger.info(f"District {location_name} mapped to NECC city {effective_city_name}, distance: {distance_to_necc} km")
        else:
            logger.warning(f"Could not map district {location_name} to an NECC city.")
            # Return 200 with empty data if district cannot be mapped
            return jsonify({
                "city_name_used_for_prediction": location_name,
                "latest_price_info": { "date": None, "price": None },
                "full_24_month_forecast": [],
                "next_calendar_year_prediction": { "year": datetime.now(pytz.timezone(CONFIG['TIMEZONE'])).year, "avg_price": None, "predictions": [] },
                "dynamic_averages_from_forecast": {
                   "next_1_month_avg": None, "next_3_months_avg": None, "next_6_months_avg": None,
                   "next_9_months_avg": None, "next_12_months_avg": None, "individual_next_12_months": []
                },
                "distance_to_necc": None # Or perhaps 0 if same city?
            }), 200 # Return 200 with empty data

    elif type != 'necc':
        return jsonify({"error": "Invalid location type specified. Use 'necc' or 'district'."}), 400

    # Use the effective_city_name for all data fetching and prediction
    if not effective_city_name:
         logger.error(f"Effective city name not determined for location {location_name}, type {type}.")
         # Return a response indicating no data for this location
         return jsonify({
             "city_name_used_for_prediction": location_name, # Or effective_city_name if null
             "latest_price_info": { "date": None, "price": None },
             "full_24_month_forecast": [],
             "next_calendar_year_prediction": { "year": datetime.now(pytz.timezone(CONFIG['TIMEZONE'])).year, "avg_price": None, "predictions": [] },
             "dynamic_averages_from_forecast": {
                "next_1_month_avg": None, "next_3_months_avg": None, "next_6_months_avg": None,
                "next_9_months_avg": None, "next_12_months_avg": None, "individual_next_12_months": []
             },
             "distance_to_necc": distance_to_necc # Include if available
         }), 200 # Return 200 with empty data if effective city name is null


    # Get the current system date in the configured timezone
    # Ensure this date is consistent for all calculations within this request
    current_system_date = datetime.now(pytz.timezone(CONFIG['TIMEZONE'])).date()

    # 1. Latest Price Info
    latest_price_data = get_latest_price_info_db(effective_city_name)

    # 2. Generate the full 24-month forecast (trained on data up to end of previous year)
    # This function now returns a LIST of dicts or an empty list []
    full_24_month_forecast_list = generate_24_month_forecast(effective_city_name, current_system_date)

    # 3. Derive Calendar Year Prediction Average and breakdown from the first 12 months of the 24-month forecast
    # The 24-month forecast starts from Jan of the current year.
    calendar_year_predictions_for_avg = full_24_month_forecast_list[:12]
    calendar_year_avg_price = None
    target_cal_year = current_system_date.year # Calendar year is the current system year

    if calendar_year_predictions_for_avg:
        # Filter out None prices before calculating mean
        prices_for_cal_year_avg = [p['price'] for p in calendar_year_predictions_for_avg if p['price'] is not None]
        if prices_for_cal_year_avg:
             calendar_year_avg_price = round(np.mean(prices_for_cal_year_avg), 2)

    calendar_year_prediction_data = {
        "year": target_cal_year,
        "avg_price": calendar_year_avg_price,
        # The 'predictions' field contains the first 12 months from the full forecast for calendar year breakdown
        "predictions": calendar_year_predictions_for_avg
    }


    # 4. Calculate dynamic averages and individual next 12 months from the full 24-month forecast list
    # This function accepts the list of dicts and processes it, starting calculations from the month after current_system_date
    derived_dynamic_forecast_data = calculate_dynamic_averages_from_forecast(full_24_month_forecast_list, current_system_date)


    response_data = {
        "city_name_used_for_prediction": effective_city_name, # Important for frontend mapping
        "latest_price_info": latest_price_data,
        # Include the full 24-month forecast data as the main prediction dataset
        "full_24_month_forecast": full_24_month_forecast_list,
        # Include derived data: Calendar year prediction (average and first 12 months breakdown)
        "next_calendar_year_prediction": calendar_year_prediction_data,
        # Dynamic averages (1M, 3M.. 12M) and individual next 12 months (from current+1)
        "dynamic_averages_from_forecast": derived_dynamic_forecast_data,
    }
    if distance_to_necc is not None:
        response_data["distance_to_necc"] = round(distance_to_necc,1)

    return jsonify(response_data)


@app.route('/api/prices/<type>/<path:location_name>')
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"])
def get_prices(type, location_name):
    logger.info(f"Price history request for type: {type}, location: {location_name}")
    effective_city_name = location_name
    if type == 'district':
        associated_city, _ = get_associated_necc_city(location_name)
        if associated_city:
            effective_city_name = associated_city
        else:
            logger.warning(f"District {location_name} not found or no associated NECC city for prices.")
            # Return 200 with empty data if district not found/mapped
            return jsonify({"city": location_name, "prices": []}), 200 # Return 200, not 404 for missing data
    elif type != 'necc':
        return jsonify({"error": "Invalid location type specified. Use 'necc' or 'district'."}), 400

    # Use the effective_city_name for data fetching
    if not effective_city_name:
        logger.error(f"Effective city name not determined for price history for location {location_name}, type {type}.")
        return jsonify({"city": location_name, "prices": []}), 200


    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    prices_df = get_historical_daily_prices_df(effective_city_name, start_date, end_date)
    # get_historical_daily_prices_df already logs if empty

    # Convert DataFrame to list of dicts
    prices_list = []
    if not prices_df.empty:
        # Iterate over DataFrame index (Date) and rows
        for date_val, row in prices_df.iterrows():
            # date_val is already a pandas Timestamp, format it
            prices_list.append({'date': date_val.strftime(CONFIG['DATE_FORMAT']), 'price': row['Price']})

    return jsonify({"city": effective_city_name, "prices": prices_list})


@app.route('/api/averages/<type>/<path:location_name>')
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"])
def get_averages(type, location_name):
    logger.info(f"Averages request for type: {type}, location: {location_name}")
    effective_city_name = location_name
    if type == 'district':
        associated_city, _ = get_associated_necc_city(location_name)
        if associated_city:
            effective_city_name = associated_city
        else:
            logger.warning(f"District {location_name} not found or no associated NECC city for averages.")
            # Return 200 with empty data if district not found/mapped
            return jsonify({
                "city": location_name,
                "yearly_avg": [],
                "monthly_avg_last_5_years": []
            }), 200 # Return 200, not 404 for missing data
    elif type != 'necc':
        return jsonify({"error": "Invalid location type specified. Use 'necc' or 'district'."}), 400

    # Use the effective_city_name for data fetching
    if not effective_city_name:
        logger.error(f"Effective city name not determined for averages for location {location_name}, type {type}.")
        return jsonify({
            "city": location_name,
            "yearly_avg": [],
            "monthly_avg_last_5_years": []
        }), 200


    # Fetch all daily prices to calculate averages
    all_daily_prices_df = get_historical_daily_prices_df(effective_city_name)
    # get_historical_daily_prices_df already logs if empty

    yearly_avg = []
    monthly_avg_last_5_years = []

    if not all_daily_prices_df.empty:
        # Yearly averages
        # Use .dt.year for integer year extraction from DatetimeIndex
        yearly_avg_df = all_daily_prices_df['Price'].resample('YE').mean().dropna() # YE for Year End
        yearly_avg = [{'year': idx.year, 'avg_price': round(price,2)} for idx, price in yearly_avg_df.items()]


        # Monthly averages for last 5 years (relative to the latest data point)
        monthly_avg_all_df = all_daily_prices_df['Price'].resample('MS').mean().dropna() # MS for Month Start

        # Filter for the last 5 full years of monthly data relative to the latest data point
        if not monthly_avg_all_df.empty:
            latest_date_in_data = all_daily_prices_df.index.max()
            # Calculate the start date for the last 5 full years, relative to the latest data year
            # Example: if latest data is in 2025, start from Jan 1 of 2021
            start_year_5_years_ago = latest_date_in_data.year - 4 # e.g., 2025 - 4 = 2021
            five_years_ago_start_timestamp = pd.Timestamp(f"{start_year_5_years_ago}-01-01")

            # Ensure filtering is within the bounds of the available monthly data
            # Only take data points from the determined start date onwards
            monthly_avg_last_5_df = monthly_avg_all_df[monthly_avg_all_df.index >= five_years_ago_start_timestamp]

            monthly_avg_last_5_years = [{'year': idx.year, 'month': idx.month, 'avg_price': round(price,2)}
                                  for idx, price in monthly_avg_last_5_df.items()]
        # else monthly_avg_last_5_years remains empty list


    return jsonify({
        "city": effective_city_name,
        "yearly_avg": yearly_avg,
        "monthly_avg_last_5_years": monthly_avg_last_5_years
    })


@app.route('/api/necc_cities')
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"] * 24) # Cache longer as this changes infrequently
def get_necc_cities():
    logger.info("Fetching list of NECC cities.")
    cities = []
    try:
        conn = get_db_connection("NEAREST_NECC_DB")
        cursor = conn.cursor()
        # Fetch distinct cities from necc_city_coordinates table
        cursor.execute("SELECT DISTINCT city FROM necc_city_coordinates ORDER BY city")
        rows = cursor.fetchall()
        conn.close()
        cities = [{"name": row['city']} for row in rows]
    except Exception as e:
        logger.error(f"Database error fetching NECC cities: {e}")
        # Return empty list and 500 status on error
        return jsonify({"error": "Could not fetch NECC cities list"}), 500
    return jsonify(cities)


@app.route('/api/districts')
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"] * 24)
def get_districts():
    logger.info("Fetching list of all districts.")
    districts = []
    try:
        conn = get_db_connection("NEAREST_NECC_DB")
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT district FROM district_necc_map ORDER BY district")
        rows = cursor.fetchall()
        conn.close()
        districts = [{"name": row['district']} for row in rows]
    except Exception as e:
        logger.error(f"Database error fetching districts: {e}")
        # Return empty list and 500 status on error
        return jsonify({"error": "Could not fetch districts list"}), 500
    return jsonify(districts)


@app.route('/api/nearby_districts/<path:necc_city>')
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"])
def get_nearby_districts(necc_city):
    logger.info(f"Fetching nearby districts for {necc_city}.")
    nearby_districts = []
    if not necc_city:
         logger.warning("NECC city not specified for nearby districts request.")
         return jsonify({"error": "NECC city not specified"}), 400
    try:
        conn = get_db_connection("NEAREST_NECC_DB")
        cursor = conn.cursor()
        # Assuming 'necc_top_districts' table with 'necc_city', 'nearby_district', 'distance', 'rank'
        cursor.execute("""
            SELECT nearby_district, distance, rank
            FROM necc_top_districts
            WHERE necc_city = ? ORDER BY rank ASC LIMIT 5
        """, (necc_city,))
        rows = cursor.fetchall()
        conn.close()
        for row in rows:
            nearby_districts.append({
                "district": row['nearby_district'],
                "distance": round(row['distance'], 1) if row['distance'] is not None else None,
                "rank": row['rank']
            })
        return jsonify(nearby_districts)
    except Exception as e:
        logger.error(f"Database error fetching nearby districts for {necc_city}: {e}")
        # Return empty list and 500 status on error
        return jsonify({"error": f"Could not fetch nearby districts for {necc_city}"}), 500


@app.route('/api/necc_cities_locations_prices')
@cache.memoize(timeout=CONFIG["CACHE_DEFAULT_TIMEOUT"]) # Cache for 1 hour, prices can update
def get_necc_cities_locations_prices():
    logger.info("Fetching locations and latest prices for all NECC cities.")
    cities_data = []

    conn_nearest = None
    conn_prices = None

    try:
        conn_nearest = get_db_connection("NEAREST_NECC_DB")
        cursor_nearest = conn_nearest.cursor()

        # Get all NECC cities with their coordinates
        # Fetch distinct cities from necc_city_coordinates table
        cursor_nearest.execute("SELECT city, latitude, longitude FROM necc_city_coordinates")
        necc_cities_coords = cursor_nearest.fetchall()


        if not necc_cities_coords:
            logger.warning("No NECC city coordinates found in necc_city_coordinates table.")
            return jsonify([])

        conn_prices = get_db_connection("NECC_PRICES_DB") # Open only once
        cursor_prices = conn_prices.cursor()

        for city_row in necc_cities_coords:
            city_name = city_row['city']
            # Fetch latest price for this city
            cursor_prices.execute("SELECT Price FROM DailyPrices WHERE City = ? ORDER BY Date DESC LIMIT 1", (city_name,))
            price_row = cursor_prices.fetchone()
            latest_price = float(price_row['Price']) if price_row and price_row['Price'] is not None else None

            cities_data.append({
                "name": city_name,
                "latitude": city_row['latitude'],
                "longitude": city_row['longitude'],
                "latest_price": latest_price
            })

        return jsonify(cities_data)

    except Exception as e:
        logger.error(f"Database error in get_necc_cities_locations_prices: {e}")
        # Return empty list and 500 status on error
        return jsonify({"error": "Failed to retrieve NECC city locations and prices"}), 500
    finally:
        if conn_nearest:
            conn_nearest.close()
        if conn_prices:
            conn_prices.close()


# --- Main Execution ---
if __name__ == '__main__':
    # Ensure database files exist before starting
    for db_key in ["NECC_PRICES_DB", "NEAREST_NECC_DB"]:
        if not os.path.exists(CONFIG[db_key]):
            logger.critical(f"CRITICAL ERROR: Database '{CONFIG[db_key]}' not found! Please ensure it exists.")
            # In a production environment, you might want a more graceful failure
            # For this project context, exiting is acceptable.
            exit(1)

    # Check for 'templates' folder if render_template is used for '/'
    # Check if the root URL is handled by render_template
    root_uses_template = False
    for rule in app.url_map.iter_rules():
        if rule.rule == '/' and 'GET' in rule.methods: # Assuming GET for root
            if hasattr(app.view_functions[rule.endpoint], '__name__') and app.view_functions[rule.endpoint].__name__ == 'index':
                 root_uses_template = True
                 break

    if root_uses_template and not os.path.exists('templates'):
         logger.warning("Flask 'templates' folder not found. Created one.")
         os.makedirs('templates', exist_ok=True) # Create it if it doesn't exist

    # Check for 'static' folder
    if not os.path.exists('static'):
        logger.warning("Flask 'static' folder not found. If you have CSS/JS, create it.")
        # os.makedirs('static', exist_ok=True) # Optionally create it

    logger.info("Starting Flask app...")
    # Consider host='0.0.0.0' for accessibility beyond localhost in some environments
    # Set debug=False for production
    app.run(debug=True, host='127.0.0.1', port=5000)