Habitify: AI-Powered Habit Tracker & Wellness Planner
Habitify is a comprehensive wellness platform built on the MERN stack that combines habit tracking with AI-driven diet and exercise recommendations. It allows users to build consistent routines while providing personalized health plans based on their unique physical attributes and medical history.

Key Features
Habit Management: Create, track, and manage daily habits with a "User Room" strategy for real-time updates.

AI Diet & Workout Planner: Generates personalized nutrition and exercise schedules using integrated Python-based machine learning models.

Progress Analytics: Visualize your consistency through dynamic heatmaps and progress charts.

Medical Safety Integration: Includes a safety engine that adjusts food and exercise suggestions based on medical guidelines and frequency rules.

Smart Notifications: Set reminders for habits and view detailed day-to-day completion stats.

Technical Stack
Frontend: React.js, Vite, Tailwind CSS, and Framer Motion.

Backend: Node.js, Express.js.

Database: MongoDB (via Mongoose).

AI/ML Layer: Python (Flask/FastAPI), Joblib for model hosting, and Pandas for data processing.

Authentication: JWT-based secure user sessions.

Project Structure
/client: The React frontend containing the dashboard, stats, and planners.

/server: The Node.js API handling business logic and database interactions.

/Model: Python scripts and datasets for the recommendation engine and safety rules.

Getting Started
Clone the Repository:

Bash
git clone [repository-url]
Setup Backend:

Navigate to /server, run npm install, and configure your default.json with your MongoDB URI.

Start the server using npm start.

Setup Frontend:

Navigate to /client, run npm install, and start the development server with npm run dev.

Setup AI Model:

Install Python dependencies from requirements.txt and run the model API scripts.
