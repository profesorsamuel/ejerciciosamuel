-- Guarda el título de cada pregunta importada desde el paquete JSON (Evaluaciones 2, 3 y 4).
-- Es opcional: sin este SQL las preguntas se guardan igual, solo que sin título en esas evaluaciones.
-- (En la Evaluación 1 el título se guarda dentro de cia_preguntas.metadatos.)
alter table public.cia14_preguntas add column if not exists titulo text;
