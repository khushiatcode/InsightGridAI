# Enhanced Business Data for InsightsGridAI

This directory contains **12 months of realistic business data** (Nov 2024 - July 2025) with enhanced dimensions for intelligent analytics.

## 📊 Files Generated

### 1. **sales.csv** (257 records)
Enhanced columns for deeper sales insights:
- `product_category`: Electronics, Office Supplies, Furniture, Clothing
- `customer_segment`: B2B, B2C, Retail
- `channel`: Direct, Online, Store
- `discount_applied`: Track promotional impact (0.00 - 0.30)
- `shipping_cost`: True delivery costs
- `profit_margin`: Profitability per transaction (0.28 - 0.48)

**Key Insights Enabled:**
- Which channels are most profitable?
- B2B vs B2C performance comparison
- Product category trends and seasonality
- Discount effectiveness analysis

### 2. **logistics.csv** (629 records)
Real-world transportation data with performance metrics:
- `origin_city` / `destination_city`: Actual routes
- `carrier`: 6 different carriers for comparison
- `delay_reason`: Traffic, Weather, Mechanical, Loading_Delay, Border_Crossing
- `on_time_delivery`: Yes/No performance tracking
- `temperature_controlled`: Special handling requirements
- `distance_km`: Route optimization potential

**Key Insights Enabled:**
- Which carriers are most reliable?
- What causes delays? (15% of shipments have issues)
- Which routes are most expensive?
- Temperature-controlled vs standard shipping costs

### 3. **finance.csv** (1,037 records)
Detailed financial tracking with budget variance:
- `category`: Fuel, Salaries, Equipment, Marketing, etc.
- `subcategory`: Drill down into specific expenses
- `cost_type`: Fixed, Variable, Capital
- `budget_allocated`: Planned spending
- `variance` / `variance_pct`: Over/under budget tracking
- `payment_status`: Paid, Pending, Approved, Overdue

**Key Insights Enabled:**
- Which departments are over budget?
- Fixed vs variable cost analysis
- Cash flow tracking (overdue payments)
- Expense forecasting by category

### 4. **customers.csv** (150 records)
Customer intelligence and health metrics:
- `segment`: B2B, B2C, Retail
- `location`: 18 different cities
- `account_manager`: Account ownership tracking
- `lifetime_value`: $1,000 - $500,000 range
- `churn_risk`: Low, Medium, High prediction
- `acquisition_date`: Customer tenure
- `last_order_date`: Activity recency

**Key Insights Enabled:**
- High-value customers at risk of churn
- Account manager performance
- Geographic revenue concentration
- Customer lifetime value analysis

### 5. **inventory.csv** (720 records)
Weekly stock level snapshots for supply chain optimization:
- `product_category`: 4 major categories
- `warehouse_location`: 5 distribution centers
- `stock_level`: Current inventory
- `reorder_point`: When to restock
- `safety_stock`: Buffer inventory
- `stockout_events`: Missed sales opportunities
- `turnover_rate`: Inventory efficiency (2.0 - 8.0)

**Key Insights Enabled:**
- Which products are at risk of stockout?
- Slow-moving vs fast-moving items
- Warehouse capacity utilization
- Optimal reorder timing

## 🎯 Data Characteristics

### Realistic Patterns
- **Seasonality**: December shows 40% higher sales volume
- **Anomalies**: 15% of shipments have delays
- **Growth**: Month-over-month growth trends
- **Variability**: Real business fluctuations, not perfect linear data

### Time Range
- **Start**: November 1, 2024
- **End**: July 10, 2025
- **Duration**: 8+ months of continuous data

### Data Quality
- **No duplicates**: Clean, unique records
- **Consistent IDs**: Proper referential integrity
- **Realistic values**: Based on actual business ranges
- **Edge cases**: Includes outliers and anomalies

## 🚀 What This Data Enables

### Predictive Analytics
- "Product X will stock out in 3 days based on current sales velocity"
- "Route R004 has 3x higher delay rate than average"
- "Customer CUST-00042 (high-value) hasn't ordered in 45 days - churn risk"

### Root Cause Analysis
- "West region delays caused by Carrier MoveWest (23% on-time rate)"
- "Marketing department 18% over budget due to Digital_Marketing spike"
- "December electronics sales 2.5x higher than average month"

### Business Optimization
- "Shifting 40% of Toronto-Montreal shipments to rail saves $45K/month"
- "Top 20% customers (B2B segment) generate 75% of lifetime value"
- "Products with turnover rate < 3.0 tie up $250K in inventory"

### Intelligent Alerts
- ⚠️ **Budget Alert**: IT department 22% over budget this month
- 📉 **Churn Warning**: 12 high-value customers show churn risk
- 📦 **Stock Alert**: P015 at Chicago warehouse below safety stock
- 🚚 **Performance Issue**: GoSouth carrier 45% on-time delivery rate

## 📥 Using This Data

### Upload to S3
Replace your existing CSV files in S3 buckets:
```bash
aws s3 cp sales.csv s3://insightgridai-sales/sales.csv
aws s3 cp logistics.csv s3://insightgridai-logistics/logistics.csv
aws s3 cp finance.csv s3://insightgridai-finance/finance.csv

# New buckets needed for additional data:
aws s3 mb s3://insightgridai-customers
aws s3 cp customers.csv s3://insightgridai-customers/customers.csv

aws s3 mb s3://insightgridai-inventory
aws s3 cp inventory.csv s3://insightgridai-inventory/inventory.csv
```

### Update Glue Tables
The data processor Lambda will need Glue catalog updates to recognize new columns.

### Dashboard Updates
Enhanced visualizations will automatically populate with richer insights once data is uploaded.

## 💡 Recommended Next Steps

1. **Upload enhanced CSVs** to replace existing data
2. **Update Glue schemas** to include new columns
3. **Add new dashboards** for:
   - Customer health monitoring
   - Inventory optimization
   - Budget variance tracking
   - Carrier performance comparison
4. **Enable predictive alerts** based on thresholds
5. **Integrate AI chat** to query across all dimensions

This enhanced dataset transforms your digital twin from basic reporting to **intelligent, actionable insights**.

