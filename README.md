# GrowMark 🌱

GrowMark is a comprehensive mobile application built with React Native and Expo, designed to help shop owners and small businesses manage their inventory, track daily sales, analyze performance, and receive actionable growth insights. 

## 🚀 Key Features

### 🔐 Authentication & Onboarding
*   **Secure Authentication:** Powered by Supabase, featuring standard Email/Password login and seamless Google Sign-In integration.
*   **Guided Onboarding:** A step-by-step setup process covering Language Selection, Shop Details Setup, Working Days configuration, and Initial Item Catalog setup.

### 📊 Dashboard & Analytics
*   **Comprehensive Overview:** A centralized dashboard (`app/dashboard/index.tsx`) providing an at-a-glance view of business metrics.
*   **Sales Tracking:** Easy-to-use interface for recording daily sales and transactions (`app/dashboard/sales-entry.tsx`).
*   **Inventory Management:** Add, edit, and track items/products available in the shop (`app/dashboard/manage-items.tsx`).
*   **Advanced Reporting:** Visual charts and graphs (powered by `react-native-gifted-charts`) to analyze sales trends and revenue over time (`app/dashboard/reports.tsx`).
*   **Daily Analysis:** In-depth breakdown of daily performance (`app/dashboard/daily-analysis.tsx`).
*   **Business Health Score:** A unique metric calculating the overall health and performance of the business (`app/dashboard/health-score.tsx`).
*   **Growth Tips:** Actionable advice and tips tailored to help the business expand and improve (`app/dashboard/growth-tips.tsx`).

### ⚙️ User Preferences & Settings
*   **Multi-language Support:** Choose preferred languages for localized app experience.
*   **Profile Management:** Manage user details and shop configurations (`app/dashboard/profile.tsx`).
*   **Smart Alerts:** Notifications for important business milestones or required actions (`app/dashboard/alerts.tsx`).

## 🛠️ Technology Stack

*   **Framework:** [React Native](https://reactnative.dev/)
*   **Platform/Toolchain:** [Expo](https://expo.dev/) (Managed Workflow)
*   **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
*   **Backend as a Service:** [Supabase](https://supabase.com/) (Database & Authentication)
*   **Authentication Providers:** Supabase Auth, Google Sign-In (`@react-native-google-signin/google-signin`)
*   **UI Components & Animations:** React Native Reanimated, Expo Vector Icons
*   **Data Visualization:** `react-native-gifted-charts`
*   **Storage:** `@react-native-async-storage/async-storage`

## 📁 Project Structure

The project utilizes Expo Router's file-based routing mechanism.

```text
GrowMark/
├── app/                      # Main application routes
│   ├── auth/                 # Login and Signup screens
│   ├── dashboard/            # Core app features (Sales, Reports, Inventory, etc.)
│   ├── onboarding/           # Initial setup screens for new users
│   ├── _layout.tsx           # Global layout configuration
│   └── index.tsx             # Entry point / Redirector
├── components/               # Reusable UI components
│   ├── ui/                   # Base UI elements
│   ├── CustomBottomNav.tsx   # Custom bottom navigation bar
│   ├── DatePickerModal.tsx   # Date selection component
│   └── ...                   # Other shared components
├── lib/                      # External service configurations
│   ├── supabase.ts           # Supabase client initialization
│   └── GoogleAuth.ts         # Google Sign-In configuration
├── assets/                   # Static assets (images, fonts, icons)
├── constants/                # App-wide constants (Colors, Themes, etc.)
├── hooks/                    # Custom React hooks
├── .env                      # Environment variables (API keys)
├── app.json                  # Expo configuration
└── package.json              # Project dependencies and scripts
```

## 💻 Local Development Setup

### Prerequisites
*   Node.js (v18 or newer recommended)
*   npm or yarn
*   Expo Go app installed on your physical device OR an Android/iOS Emulator set up on your machine.
*   Supabase project set up for backend services.

### Installation

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone https://github.com/Selvamk4306/GrowMark.git
    cd GrowMark
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Ensure you have a `.env` file in the root directory with the necessary Supabase and Google Sign-in credentials.
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    # Add other required keys (e.g., Google Web Client ID)
    ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

*   **To run on an Android Emulator:** Press `a` in the terminal.
*   **To run on an iOS Simulator:** Press `i` in the terminal (Requires macOS).
*   **To run on a physical device:** Scan the QR code shown in the terminal using the Expo Go app (Android) or the Camera app (iOS).

## 📜 Available Scripts

*   `npm start`: Starts the Expo development server.
*   `npm run android`: Compiles and runs the app on an Android device/emulator (Requires native Android setup).
*   `npm run ios`: Compiles and runs the app on an iOS simulator (Requires macOS and Xcode).
*   `npm run web`: Starts the app in a web browser.
*   `npm run lint`: Runs ESLint to find and fix styling/syntax issues.
*   `npm run reset-project`: A custom script to reset the project state (use with caution).

## 🚀 Building & Deployment

The project is configured for Expo Application Services (EAS).

To build the app for production (APK/AAB or IPA), you can use EAS Build:

1. Install EAS CLI: `npm install -g eas-cli`
2. Login to your Expo account: `eas login`
3. Configure the project: `eas build:configure`
4. Run a build:
   * Android: `eas build --platform android`
   * iOS: `eas build --platform ios`

## 📄 License and Legal
*   Please refer to the **Terms of Use** and **Privacy Policy** within the app for usage guidelines.
