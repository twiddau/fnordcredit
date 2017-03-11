--CREATE EXTENSION pgcrypto;

DROP SCHEMA fnordcredit CASCADE;

CREATE SCHEMA fnordcredit AUTHORIZATION fnordcredit;
ALTER ROLE fnordcredit SET search_path TO fnordcredit;

CREATE TABLE fnordcredit.users (
    name text PRIMARY KEY,
    credit NUMERIC(16,2) NOT NULL DEFAULT '0.00'::numeric,
    pincode text NULL,
    token text NULL,
    lastchanged TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE fnordcredit.products (
    name text PRIMARY KEY,
    description text NULL,
    price NUMERIC(16,2) NOT NULL DEFAULT '0.00'::numeric,
    image text NULL,
    ean text NULL,
    orderpos integer DEFAULT 0
);


CREATE TABLE fnordcredit.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL REFERENCES fnordcredit.users (name),
    time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delta NUMERIC(16,2) NOT NULL,
    credit NUMERIC(16,2) NOT NULL DEFAULT '0.00'::numeric,
    description text NULL,
    product text NULL REFERENCES fnordcredit.products (name)
);

ALTER TABLE fnordcredit.users OWNER TO fnordcredit;
ALTER TABLE fnordcredit.products OWNER TO fnordcredit;
ALTER TABLE fnordcredit.transactions OWNER TO fnordcredit;



INSERT INTO fnordcredit.users VALUES ('Twi');