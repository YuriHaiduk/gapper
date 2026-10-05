.PHONY: up down

# Dev server in the background: http://localhost:5173/gapper/
up:
	docker compose up -d
	@echo "Gapper: http://localhost:5173/gapper/"

down:
	docker compose down
