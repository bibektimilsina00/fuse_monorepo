docker stop nexushq-postgres
docker-compose down && docker-compose up -d db redis
make migrate
