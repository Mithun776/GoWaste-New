# GoWaste Backend

## Project Overview
GoWaste is a waste management and recycling application designed to help users manage and track their waste disposal efforts efficiently.

## Project Structure
```
Backend/
│
├── api/               # API endpoints and views
│   ├── models.py      # Database models
│   ├── views.py       # API view logic
│   └── urls.py        # URL routing
│
├── GoWaste/           # Django project configuration
├── config.py          # Project configuration settings
├── manage.py          # Django management script
└── requirements.txt   # Python dependencies
```

## Setup and Installation

### Prerequisites
- Python 3.8+
- pip
- virtualenv (recommended)

### Installation Steps
1. Clone the repository
2. Create a virtual environment
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables
   - Copy `.env.example` to `.env`
   - Fill in necessary configuration details

### Running the Application
```bash
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Key Features
- Waste tracking and management
- Recycling recommendations
- User authentication and profile management

## Technologies Used
- Django
- Django REST Framework
- SQLite/PostgreSQL
- Python
