"""
Simple ML Predictions Module - Pure Python (No NumPy required!)
Uses only Python standard library for trend analysis and seasonality detection
"""

import math
from datetime import datetime, timedelta

def _calculate_mean(data):
    """Calculate mean of a list"""
    return sum(data) / len(data) if data else 0

def _calculate_std(data):
    """Calculate standard deviation"""
    if len(data) < 2:
        return 0
    mean = _calculate_mean(data)
    variance = sum((x - mean) ** 2 for x in data) / (len(data) - 1)
    return math.sqrt(variance)

def _calculate_trend(data_series):
    """
    Calculate linear trend using least squares regression (Pure Python!)
    Returns: {'slope': float, 'intercept': float, 'r_squared': float}
    """
    if len(data_series) < 2:
        return {'slope': 0, 'intercept': data_series[0] if len(data_series) > 0 else 0, 'r_squared': 0}
    
    n = len(data_series)
    x = list(range(n))  # [0, 1, 2, 3...]
    y = [float(val) for val in data_series]
    
    # Remove any invalid values
    valid_pairs = [(xi, yi) for xi, yi in zip(x, y) if not (math.isnan(yi) or math.isinf(yi))]
    if len(valid_pairs) < 2:
        return {'slope': 0, 'intercept': valid_pairs[0][1] if valid_pairs else 0, 'r_squared': 0}
    
    x, y = zip(*valid_pairs)
    n = len(x)
    
    # Calculate sums for least squares
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)
    
    # Least squares: y = mx + b
    denominator = (n * sum_x2 - sum_x ** 2)
    if denominator == 0:
        return {'slope': 0, 'intercept': _calculate_mean(y), 'r_squared': 0}
    
    m = (n * sum_xy - sum_x * sum_y) / denominator
    b = (sum_y - m * sum_x) / n
    
    # Calculate R-squared
    y_mean = _calculate_mean(y)
    ss_total = sum((yi - y_mean) ** 2 for yi in y)
    y_pred = [m * xi + b for xi in x]
    ss_res = sum((yi - yi_pred) ** 2 for yi, yi_pred in zip(y, y_pred))
    
    r_squared = 1 - (ss_res / ss_total) if ss_total > 0 else 0
    r_squared = max(0, min(1, r_squared))  # Clamp between 0 and 1
    
    return {
        'slope': float(m),
        'intercept': float(b),
        'r_squared': float(r_squared)
    }

def _detect_seasonality(data_series):
    """
    Detect seasonality using coefficient of variation (Pure Python!)
    Returns: {'has_seasonality': bool, 'variation': float, 'factor': float}
    """
    if len(data_series) < 3:
        return {'has_seasonality': False, 'variation': 0, 'factor': 1.0}
    
    data = [float(val) for val in data_series if not (math.isnan(val) or math.isinf(val))]
    
    if len(data) < 3:
        return {'has_seasonality': False, 'variation': 0, 'factor': 1.0}
    
    mean = _calculate_mean(data)
    if mean == 0:
        return {'has_seasonality': False, 'variation': 0, 'factor': 1.0}
    
    # Coefficient of variation
    std = _calculate_std(data)
    variation = std / mean
    has_seasonality = variation > 0.15  # 15% threshold
    
    return {
        'has_seasonality': bool(has_seasonality),
        'variation': float(variation),
        'factor': float(1 + (variation * 0.5))  # Adjustment factor
    }

def predict_fuel_price_with_ml(parameters, logistics_data):
    """
    ML-enhanced fuel price prediction with trend analysis and seasonality
    
    Args:
        parameters: dict with fuel_increase_percent, time_horizon_months, fuel_cost_ratio
        logistics_data: list of dicts with historical logistics data
    
    Returns:
        dict with ML-enhanced predictions
    """
    fuel_increase_percent = parameters.get('fuel_increase_percent', 10)
    time_horizon_months = parameters.get('time_horizon_months', 12)
    fuel_cost_ratio = parameters.get('fuel_cost_ratio', 30) / 100
    
    # Extract historical costs
    historical_costs = []
    for row in logistics_data:
        if 'fuel_used_l' in row and 'fuel_price_per_l' in row:
            cost = float(row.get('fuel_used_l', 0)) * float(row.get('fuel_price_per_l', 0))
            if cost > 0:
                historical_costs.append(cost)
    
    if len(historical_costs) < 2:
        # Fallback to simple calculation if not enough data
        avg_cost = sum(historical_costs) / len(historical_costs) if historical_costs else 1000
        monthly_impact = avg_cost * len(logistics_data) * fuel_cost_ratio * (fuel_increase_percent / 100)
        
        return {
            'scenario': 'Fuel Price Increase (Insufficient Data for ML)',
            'fuel_increase_percent': fuel_increase_percent,
            'time_horizon_months': time_horizon_months,
            'total_cost_impact': monthly_impact * time_horizon_months,
            'projected_cost_increase': monthly_impact,
            'monthly_breakdown': [
                {
                    'month': f'Month {i}',
                    'monthly_cost_increase': round(monthly_impact, 2),
                    'cumulative_cost_increase': round(monthly_impact * i, 2)
                }
                for i in range(1, time_horizon_months + 1)
            ],
            'recommendations': ['Insufficient historical data for ML predictions']
        }
    
    # Calculate trend
    trend = _calculate_trend(historical_costs)
    
    # Detect seasonality
    seasonality = _detect_seasonality(historical_costs)
    
    # Base calculations
    avg_cost = _calculate_mean(historical_costs)
    shipment_count = len(logistics_data)
    monthly_cost = avg_cost * shipment_count
    base_monthly_impact = monthly_cost * fuel_cost_ratio * (fuel_increase_percent / 100)
    
    # Generate ML-enhanced monthly predictions
    monthly_breakdown = []
    cumulative_cost = 0
    total_impact = 0
    
    for month in range(1, time_horizon_months + 1):
        # Start with base impact
        predicted_impact = base_monthly_impact
        
        # Apply trend adjustment
        if trend['r_squared'] > 0.3:  # Only apply if trend is significant
            trend_adjustment = trend['slope'] * month * fuel_cost_ratio * (fuel_increase_percent / 100)
            predicted_impact += trend_adjustment
        
        # Apply seasonality adjustment
        if seasonality['has_seasonality']:
            # Simple sinusoidal seasonality pattern (peaks in Q4)
            seasonal_factor = math.sin(2 * math.pi * month / 12)
            seasonal_adjustment = predicted_impact * seasonality['variation'] * seasonal_factor * 0.5
            predicted_impact += seasonal_adjustment
        
        cumulative_cost += predicted_impact
        total_impact += predicted_impact
        
        # Confidence ranges (±20%)
        confidence_range = predicted_impact * 0.20
        optimistic = max(0, predicted_impact - confidence_range)
        pessimistic = predicted_impact + confidence_range
        
        monthly_breakdown.append({
            'month': f'Month {month}',
            'monthly_cost_increase': round(predicted_impact, 2),
            'cumulative_cost_increase': round(cumulative_cost, 2),
            'optimistic_scenario': round(optimistic, 2),
            'pessimistic_scenario': round(pessimistic, 2)
        })
    
    # Generate intelligent recommendations
    recommendations = []
    
    if trend['slope'] > 0 and trend['r_squared'] > 0.5:
        recommendations.append({
            'type': 'warning',
            'title': 'Upward Cost Trend Detected',
            'description': f'Historical data shows costs rising by ${abs(trend["slope"]):.2f} per period',
            'action': 'Lock in fuel contracts now before prices increase further'
        })
    elif trend['slope'] < 0:
        recommendations.append({
            'type': 'info',
            'title': 'Favorable Cost Trend',
            'description': 'Costs have been declining historically',
            'action': 'Consider short-term contracts to benefit from potential further decreases'
        })
    
    if seasonality['has_seasonality']:
        recommendations.append({
            'type': 'info',
            'title': 'Seasonal Pattern Detected',
            'description': f'Costs vary by {seasonality["variation"]*100:.1f}% seasonally',
            'action': 'Consider bulk purchasing during low-cost periods (typically Q1-Q2)'
        })
    
    if fuel_increase_percent > 15:
        recommendations.append({
            'type': 'warning',
            'title': 'High Impact Scenario',
            'description': f'${total_impact:,.0f} total impact over {time_horizon_months} months',
            'action': f'Explore alternative fuel sources or shift {int(fuel_increase_percent * 0.5)}% of shipments to rail'
        })
    else:
        recommendations.append({
            'type': 'action',
            'title': 'Moderate Impact',
            'description': 'Impact is manageable with optimization',
            'action': 'Focus on route optimization and fuel efficiency improvements'
        })
    
    # Determine trend direction
    if trend['r_squared'] > 0.3:
        if trend['slope'] > avg_cost * 0.01:  # More than 1% increase per period
            trend_direction = 'rising'
        elif trend['slope'] < -avg_cost * 0.01:
            trend_direction = 'falling'
        else:
            trend_direction = 'stable'
    else:
        trend_direction = 'stable'
    
    return {
        'scenario': 'ML-Enhanced Fuel Price Prediction',
        'model_type': 'Linear Regression + Seasonality Detection (Pure Python)',
        'fuel_increase_percent': fuel_increase_percent,
        'time_horizon_months': time_horizon_months,
        'current_monthly_cost': monthly_cost,
        'projected_cost_increase': base_monthly_impact,
        'total_cost_impact': total_impact,
        'monthly_breakdown': monthly_breakdown,
        'model_info': {
            'trend_detected': bool(trend['r_squared'] > 0.3),
            'seasonality_detected': seasonality['has_seasonality'],
            'confidence': int(trend['r_squared'] * 100),
            'data_points': len(historical_costs),
            'trend_direction': trend_direction,
            'seasonal_variation': round(seasonality['variation'] * 100, 1)
        },
        'recommendations': recommendations
    }

def predict_demand_with_ml(parameters, sales_data):
    """
    ML-enhanced demand forecast with trend analysis (Pure Python!)
    
    Args:
        parameters: dict with demand_increase_percent, time_horizon_months
        sales_data: list of dicts with historical sales data
    
    Returns:
        dict with ML-enhanced demand predictions
    """
    demand_increase_percent = parameters.get('demand_increase_percent', 15)
    time_horizon_months = parameters.get('time_horizon_months', 12)
    
    # Extract historical revenue
    historical_revenue = []
    for row in sales_data:
        if 'revenue' in row:
            revenue = float(row.get('revenue', 0))
            if revenue > 0:
                historical_revenue.append(revenue)
    
    if len(historical_revenue) < 2:
        # Fallback to simple calculation
        avg_revenue = sum(historical_revenue) / len(historical_revenue) if historical_revenue else 10000
        monthly_increase = avg_revenue * len(sales_data) * (demand_increase_percent / 100)
        
        return {
            'scenario': 'Demand Forecast (Insufficient Data for ML)',
            'demand_increase_percent': demand_increase_percent,
            'time_horizon_months': time_horizon_months,
            'current_monthly_revenue': avg_revenue * len(sales_data),
            'projected_revenue_increase': monthly_increase,
            'total_revenue_increase': monthly_increase * time_horizon_months,
            'monthly_breakdown': [],
            'capacity_requirements': ['Insufficient historical data for ML predictions']
        }
    
    # Calculate trend
    trend = _calculate_trend(historical_revenue)
    
    # Detect seasonality
    seasonality = _detect_seasonality(historical_revenue)
    
    # Base calculations
    avg_revenue = _calculate_mean(historical_revenue)
    order_count = len(sales_data)
    current_monthly_revenue = avg_revenue * order_count
    base_monthly_increase = current_monthly_revenue * (demand_increase_percent / 100)
    
    # Generate ML-enhanced monthly predictions
    monthly_breakdown = []
    total_increase = 0
    
    for month in range(1, time_horizon_months + 1):
        # Start with base projection
        projected_revenue = current_monthly_revenue + (base_monthly_increase * (month / time_horizon_months))
        
        # Apply trend adjustment
        if trend['r_squared'] > 0.3:
            trend_adjustment = trend['slope'] * month
            projected_revenue += trend_adjustment
        
        # Apply seasonality adjustment
        if seasonality['has_seasonality']:
            seasonal_factor = math.sin(2 * math.pi * month / 12)
            seasonal_adjustment = projected_revenue * seasonality['variation'] * seasonal_factor * 0.3
            projected_revenue += seasonal_adjustment
        
        monthly_increase = projected_revenue - current_monthly_revenue
        total_increase += monthly_increase
        
        monthly_breakdown.append({
            'month': f'Month {month}',
            'current_revenue': round(current_monthly_revenue, 2),
            'projected_revenue': round(projected_revenue, 2),
            'revenue_increase': round(monthly_increase, 2)
        })
    
    # Generate capacity requirements
    capacity_requirements = [
        f"Increase inventory by {demand_increase_percent}%",
        f"Consider hiring {max(1, int(demand_increase_percent / 10))} additional staff",
    ]
    
    if seasonality['has_seasonality']:
        capacity_requirements.append(
            f"Plan for {seasonality['variation']*100:.0f}% seasonal fluctuations in demand"
        )
    
    if trend['slope'] > 0 and trend['r_squared'] > 0.5:
        capacity_requirements.append(
            "Historical growth trend detected - plan for sustained expansion"
        )
    
    return {
        'scenario': 'ML-Enhanced Demand Forecast',
        'model_type': 'Trend Analysis + Seasonality (Pure Python)',
        'demand_increase_percent': demand_increase_percent,
        'time_horizon_months': time_horizon_months,
        'current_monthly_revenue': current_monthly_revenue,
        'projected_monthly_revenue': current_monthly_revenue + base_monthly_increase,
        'projected_revenue_increase': base_monthly_increase,
        'total_revenue_increase': total_increase,
        'monthly_breakdown': monthly_breakdown,
        'model_info': {
            'trend_detected': bool(trend['r_squared'] > 0.3),
            'seasonality_detected': seasonality['has_seasonality'],
            'confidence': int(trend['r_squared'] * 100),
            'data_points': len(historical_revenue)
        },
        'capacity_requirements': capacity_requirements
    }
