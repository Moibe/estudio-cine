-- Rename junction table to a meaningfully-named normalizer entity.
-- The structure (composite PK on escena_id + personaje_id) and FKs stay the same;
-- only the table name changes. SQLite ALTER TABLE RENAME preserves all data
-- and updates dependent foreign key references automatically.
ALTER TABLE `escenas_personajes` RENAME TO `participaciones`;
