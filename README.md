# Weather App – Next.js + Tailwind

A production-style weather web app built with **Next.js**, **Tailwind CSS**, and **OpenWeatherMap** as part of an internship assignment.

## 🌤 Features

- Search for any city worldwide
- Real-time current weather
- 5-day dynamic forecast
- °C / °F unit toggle
- Error & loading states
- Responsive UI (desktop + mobile)
- Figma-inspired styling & polish

##Bonus
-°C ↔ °F unit toggle
-Error UX (city not found, invalid input, network issues)
-OpenWeather icon integration for forecast
-Clean commit history + conventional commit messages
-GitHub-ready project structur

## 🛠 Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- OpenWeatherMap API
- Git & GitHub

## Notes (What we’d improve with more time)

- Add “Use my location” button using the Geolocation API.
- Improve the 5-day forecast UI with more detailed data (precipitation, min/        max, sunrise/sunset).
- Add loading skeletons and small motion/animations for a smoother UX.
- Support multiple languages and units (mph, km/h, etc.).
- Write unit tests for the API routes and key UI components.
- Add better accessibility (ARIA labels and keyboard navigation).

## Live Demo
- https://weather-app-eta-six-12.vercel.app/


## 🚀 Getting Started
```bash
WEATHER_API_KEY=your_openweathermap_api_key
npm install
npm run dev
