# Guion de demo — Transforma+ v3

## 1. Problema

“Hoy gran parte del pipeline de Transformación nace como reacción a fallas. Transforma+ abre un canal para descubrir oportunidades desde quienes conocen el proceso en el día a día.”

## 2. Inicio

Mostrar las cuatro entradas: idea, problema, tarea repetitiva y automatización. La persona no necesita elaborar un business case ni conocer la solución.

## 3. Crear una idea

Crear una oportunidad desde el formulario de tres pasos. Al enviarla, remarcar que ya no queda en el navegador: **el servidor la escribe inmediatamente en `data/db.json`** y genera su ID.

## 4. Explorar y apoyar

Abrir otra idea, revisar su detalle y pulsar “Apoyar”. El apoyo es reversible y queda registrado en la misma base compartida.

## 5. Seguimiento

Ir a “Mis ideas” y mostrar el recorrido: Recibida → En evaluación → Priorizada → En desarrollo → Implementada.

## 6. Transformación

Abrir el pipeline, explicar Impacto / Esfuerzo, mover una iniciativa y mostrar la tarjeta “Base JSON activa”. Cada modificación queda persistida y el historial se actualiza cuando cambia el estado.

## 7. Mensaje técnico

“Para el MVP evitamos una infraestructura compleja: React + una API Node mínima + un JSON central. Varias personas conectadas a la misma instancia ven la misma base y la aplicación se resincroniza automáticamente. Si el piloto funciona, la capa JSON se puede sustituir por Microsoft Lists/Dataverse o una base corporativa sin reconstruir la experiencia.”
