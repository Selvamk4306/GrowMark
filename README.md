# GrowMark 🌱

GrowMark is a comprehensive mobile and web application built with React Native and Expo, designed to help shop owners and small businesses manage inventory, track daily sales, analyze performance, and receive actionable growth insights.

---

# 🚀 Key Features

## 🔐 Authentication & Onboarding

* Secure Authentication powered by Supabase Auth
* Email/Password Login
* Google Sign-In Integration
* Guided Onboarding Process:

  * Language Selection
  * Shop Setup
  * Working Days Configuration
  * Product Setup

---

## 📊 Dashboard & Analytics

### Dashboard

* Business Health Score
* Revenue Summary
* Profit Summary
* Alert Overview
* Performance Snapshot

### Sales Tracking

* Daily Item-Level Sales Entry
* Backdated Entry (up to 30 days)
* Auto-load Existing Data
* Edit Previous Records

### Inventory Management

* Add Products
* Edit Products
* Delete Products
* Set Daily Targets
* Set Weekly Targets

### Reporting & Visualization

* Weekly Revenue Charts
* Sales Trend Analysis
* Weekly Performance Summary
* Top Performing Products
* Alert Statistics

### Business Health Monitoring

* Business Health Score (0–100)
* Performance Classification
* Revenue Growth Tracking
* Profit Margin Analysis

### Growth Recommendations

* Rule-Based Recommendation Engine
* Product Performance Suggestions
* Revenue Improvement Tips
* Inventory Optimization Suggestions

---

## ⚙️ User Preferences & Settings

### Profile Management

* Shop Information
* Owner Details
* Working Days Configuration

### Language Support

* English
* Tamil
* Hindi
* Telugu
* Kannada
* Malayalam

### Leave Management

* Leave
* Holiday
* Festival
* Emergency

Leave days are automatically excluded from:

* Alert Generation
* Consecutive Failure Detection
* Business Health Score Calculation
* Weekly Reports

---

# 🛠️ Technology Stack

## Frontend

* React Native
* Expo
* TypeScript
* Expo Router

## Backend

* Supabase
* PostgreSQL Database
* Supabase Authentication

## UI & Visualization

* React Native Reanimated
* Expo Vector Icons
* React Native Gifted Charts

## Storage

* AsyncStorage

---

# 🗄️ Database Schema

GrowMark uses PostgreSQL through Supabase.

## owners

Stores shop owner information.

| Column       | Type      |
| ------------ | --------- |
| id           | UUID      |
| user_id      | UUID      |
| shop_name    | TEXT      |
| shop_type    | TEXT      |
| working_days | TEXT[]    |
| language     | TEXT      |
| created_at   | TIMESTAMP |

---

## items

Stores product information.

| Column        | Type    |
| ------------- | ------- |
| id            | UUID    |
| owner_id      | UUID    |
| item_name     | TEXT    |
| selling_price | NUMERIC |
| cost_price    | NUMERIC |
| daily_target  | INTEGER |
| weekly_target | INTEGER |

---

## daily_sales

Stores daily sales records.

| Column        | Type    |
| ------------- | ------- |
| id            | UUID    |
| owner_id      | UUID    |
| item_id       | UUID    |
| sale_date     | DATE    |
| quantity_sold | INTEGER |
| total_revenue | NUMERIC |
| total_profit  | NUMERIC |

---

## alerts

Stores generated alerts.

| Column       | Type      |
| ------------ | --------- |
| id           | UUID      |
| owner_id     | UUID      |
| item_id      | UUID      |
| severity     | TEXT      |
| message      | TEXT      |
| triggered_at | TIMESTAMP |

---

## health_scores

Stores weekly health score calculations.

| Column             | Type      |
| ------------------ | --------- |
| id                 | UUID      |
| owner_id           | UUID      |
| score              | NUMERIC   |
| revenue_growth     | NUMERIC   |
| profit_margin      | NUMERIC   |
| target_achievement | NUMERIC   |
| expense_control    | NUMERIC   |
| calculated_at      | TIMESTAMP |

---

## leave_days

Stores non-working days.

| Column     | Type |
| ---------- | ---- |
| id         | UUID |
| owner_id   | UUID |
| leave_date | DATE |
| leave_type | TEXT |
| remarks    | TEXT |

---

# ⚙️ Core Algorithms

## 1. Daily Threshold Check

Evaluates item performance against daily targets.

Classification:

* Met Target
* Below Target
* Zero Sales
* Dead Stock

---

## 2. Consecutive Failure Detection

Counts consecutive days below target.

Alert Levels:

* Warning
* Alert
* Critical
* Dead Stock

Leave days and non-working days are excluded.

---

## 3. Business Health Score

Formula:

Score =
(Revenue Growth × 0.30)

* (Profit Margin × 0.30)
* (Target Achievement × 0.20)
* (Expense Control × 0.20)

Component Weights:

| Component          | Weight |
| ------------------ | ------ |
| Revenue Growth     | 30%    |
| Profit Margin      | 30%    |
| Target Achievement | 20%    |
| Expense Control    | 20%    |

---

Score Classification:

* 80–100 → Healthy
* 50–79 → Needs Attention
* 0–49 → Poor Performer

---

## 4. Recommendation Engine

Analyzes:

* Consecutive Misses
* Dead Stock Items
* Revenue Decline
* Low Profit Margin
* Overperforming Products

Generates actionable growth tips.

---

# 🔄 Application Workflow

1. User Registration / Login
2. Shop Setup
3. Working Days Configuration
4. Product Setup
5. Daily Sales Entry
6. Threshold Evaluation
7. Alert Generation
8. Health Score Calculation
9. Recommendation Generation
10. Dashboard & Reports Display

---

# 🔒 Security Features

* Supabase Authentication
* Google OAuth
* Row Level Security (RLS)
* Session Persistence
* User Data Isolation
* Secure API Access

---

# 📁 Project Structure

```text
GrowMark/
├── app/
│   ├── auth/
│   ├── dashboard/
│   ├── onboarding/
│   ├── _layout.tsx
│   └── index.tsx
├── components/
├── lib/
├── assets/
├── constants/
├── hooks/
├── .env
├── app.json
└── package.json
```

# 💻 Local Development Setup

## Installation

```bash
git clone https://github.com/Selvamk4306/GrowMark.git
cd GrowMark
npm install
```

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Application

```bash
npx expo start
```

Android:

```bash
npm run android
```

Web:

```bash
npm run web
```

---

# 📜 Available Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
npm run reset-project
```

---

# 🚀 Deployment

Using Expo Application Services (EAS):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

---

# 📄 License & Legal

Please refer to the application's Privacy Policy and Terms of Use for detailed information regarding usage, data handling, and user responsibilities.
