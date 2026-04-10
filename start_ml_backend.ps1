Write-Host "Starting Flowcast ML Backend..." -ForegroundColor Cyan
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
