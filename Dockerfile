FROM python:3.11-slim

WORKDIR /workspace

COPY . .

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

EXPOSE 8000

CMD ["gunicorn", "-c", "gunicorn_config.py", "app:app"]