CREATE TABLE IF NOT EXISTS clients (
    id      SERIAL PRIMARY KEY NOT NULL,
    id_time VARCHAR UNIQUE NOT NULL
);


CREATE TABLE IF NOT EXISTS secs (
    id          SERIAL PRIMARY KEY NOT NULL,
    id_time     VARCHAR,
    client_lock VARCHAR,
    content     TEXT
);
