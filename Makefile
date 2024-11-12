init:
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

cli:
	python -m http.server --directory frontend 3000
