CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY NOT NULL,
    id_time CHAR(14) UNIQUE NOT NULL
);


CREATE TABLE IF NOT EXISTS secs (
    id SERIAL PRIMARY KEY NOT NULL,
    id_time CHAR(16),
    client_lock INTEGER,
    content TEXT
);
