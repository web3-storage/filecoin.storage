GRANT USAGE ON SCHEMA public TO stats;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO stats;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO stats;
