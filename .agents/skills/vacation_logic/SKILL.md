---
name: vacaciones-progresivas-chile
description:
  Reglas y lógica de negocio para calcular días de vacaciones anuales con feriado progresivo según
  ley chilena (Art. 67–68 Código del Trabajo). Usar este skill siempre que se necesite determinar
  cuántos días de vacaciones anuales le corresponden a un trabajador en Chile, considerando sus
  años de cotizaciones totales acumuladas y sus años de antigüedad en la empresa actual. Activar
  ante cualquier consulta sobre días de vacaciones, feriado progresivo, cotizaciones acumuladas,
  años en empresa, o cálculo de beneficios de descanso anual en Chile.
---

# Skill: Vacaciones Progresivas – Ley Chilena

## Base Legal
- **Art. 67 CT** → Todo trabajador con al menos 1 año en la empresa tiene derecho a **15 días hábiles** de vacaciones al año.
- **Art. 68 CT** → Una vez acreditados **10 o más años de cotizaciones totales** (sumando todos los empleadores), se gana **1 día adicional** por cada **3 años completos** de antigüedad en la empresa actual, contados desde que se alcanzó ese umbral.

---

## Datos que el agente debe recopilar

Antes de calcular, el agente debe conocer:

1. **Años de cotizaciones totales** del trabajador (empleadores anteriores + tiempo en empresa actual).
2. **Años completos de antigüedad** en la empresa actual al momento de la consulta.

---

## Reglas de Negocio

### Regla 1 – Días base
Todo trabajador con al menos 1 año en la empresa parte con **15 días hábiles** de vacaciones anuales. Este es el piso, nunca puede ser menor.

### Regla 2 – Habilitación del progresivo
El feriado progresivo **solo aplica** si el trabajador acumula **10 o más años de cotizaciones totales**, sumando todos sus empleadores anteriores más el tiempo en la empresa actual. Si no llega a ese umbral, le corresponden únicamente los 15 días base.

### Regla 3 – Punto de partida del contador progresivo
El contador para ganar días progresivos **no parte desde el primer día en la empresa**. Parte desde el momento exacto en que el trabajador alcanzó los 10 años de cotizaciones totales. Si llegó a la empresa ya con 10 o más años cotizados, el contador parte desde su primer día ahí. Si llegó con menos de 10 años, el contador parte desde el año en que completó los 10 dentro de esa empresa.

### Regla 4 – Frecuencia de acumulación
Por cada **3 años completos** transcurridos desde el punto de partida (Regla 3), se suma **1 día** a las vacaciones anuales. Los días se acumulan indefinidamente, no hay tope legal.

### Regla 5 – Fórmula de cálculo
```
días_progresivos = ENTERO_INFERIOR( años_desde_umbral / 3 )
días_vacaciones_anuales = 15 + días_progresivos
```
Siempre usar entero inferior (redondear hacia abajo). Nunca redondear hacia arriba.

### Regla 6 – Disponibilidad Inmediata y Saldo Negativo
Apenas comience enero de un nuevo periodo, el sistema debe permitir que se ingresen todas las vacaciones correspondientes a este periodo, considerando los 15 días legales más los días progresivos que correspondan. Esto permite registrar vacaciones adelantadas. Si el trabajador toma estos días antes de completar el año al periodo correspondiente, su saldo disponible actual figurará en **negativo**.

Ejemplo: el trabajador comenzo el 06-12. El sistema permitira tomar al trabajador los 15 dias del periodo 2012-2013 en enero del 2013, considerando saldo negativo que se ira reestableciendo.

### Regla 7 – Límite de Saldo Negativo
La regla central del sistema sobre vacaciones adelantadas es que **no se pueden acumular más de 15 días negativos**. El agente no debe permitir procesar solicitudes que dejen al trabajador con un saldo negativo mayor a -15 días.

### Regla 8 – Restablecimiento del Saldo
El saldo actual disponible se irá restableciendo paulatinamente (volviendo a cero y luego pasando a positivo) en base a la acumulación progresiva de los días legales y progresivos que el trabajador gane por el transcurso del tiempo trabajado.

---

## Tabla de Referencia

| Años desde que alcanzó los 10 cotizados | Días progresivos ganados | Total días de vacaciones al año |
|:---:|:---:|:---:|
| 0 – 2 | 0 | 15 |
| 3 – 5 | 1 | 16 |
| 6 – 8 | 2 | 17 |
| 9 – 11 | 3 | 18 |
| 12 – 14 | 4 | 19 |
| 15 – 17 | 5 | 20 |

---

## Ejemplos

### Ejemplo 1 – Trabajador que ingresa exactamente con 10 años cotizados

Trabajador llega a la empresa habiendo acumulado exactamente 10 años de cotizaciones con empleadores anteriores.

| Momento | Años desde umbral | Días progresivos | Total días/año |
|---|:---:|:---:|:---:|
| Ingresa a la empresa | 0 | 0 | 15 |
| Cumple 3 años en la empresa | 3 | 1 | **16** |
| Cumple 6 años en la empresa | 6 | 2 | **17** |
| Cumple 9 años en la empresa | 9 | 3 | **18** |

---

### Ejemplo 2 – Trabajador que llega con cotizaciones parciales

Trabajador ingresa con **8 años cotizados** en empleadores anteriores. Lleva **6 años** en la empresa actual.

- Cotizaciones totales: 8 + 6 = **14 años** → aplica progresivo.
- Alcanzó los 10 cotizados a los **2 años** en esta empresa (8 + 2 = 10).
- Años desde el umbral: 6 − 2 = **4 años**.
- Días progresivos: entero inferior de 4 ÷ 3 = **1 día**.
- **Total: 16 días de vacaciones anuales.**
- Próximo aumento: en **2 años más** (al cumplir 6 años desde el umbral).

---

### Ejemplo 3 – Primer y único empleador

Trabajador sin empleadores anteriores. Lleva **17 años** en la misma empresa.

- Cotizaciones totales: 0 + 17 = **17 años** → aplica progresivo.
- Alcanzó los 10 cotizados al **año 10** en esta empresa.
- Años desde el umbral: 17 − 10 = **7 años**.
- Días progresivos: entero inferior de 7 ÷ 3 = **2 días**.
- **Total: 17 días de vacaciones anuales.**
- Próximo aumento: en **2 años más** (al cumplir 9 años desde el umbral).

---

### Ejemplo 4 – Trabajador que aún no alcanza el umbral

Trabajador con **5 años cotizados** antes, lleva **3 años** en la empresa actual.

- Cotizaciones totales: 5 + 3 = **8 años** → no alcanza los 10 requeridos.
- **No aplica progresivo.**
- **Total: 15 días de vacaciones anuales.**
- Le faltan **2 años más** para activar el beneficio progresivo.

---

### Ejemplo 5 – Trabajador que ya tenía más de 10 años al ingresar

Trabajador ingresa con **15 años cotizados** en empleadores anteriores. Lleva **7 años** en la empresa actual.

- Cotizaciones totales: 15 + 7 = **22 años** → aplica progresivo.
- Ya tenía más de 10 cotizados al ingresar → el contador parte desde su primer día en esta empresa.
- Años desde el umbral: **7 años**.
- Días progresivos: entero inferior de 7 ÷ 3 = **2 días**.
- **Total: 17 días de vacaciones anuales.**
- Próximo aumento: en **2 años más**.

---

## Validaciones que el agente debe aplicar

- Si las cotizaciones totales son menores a 10, el resultado siempre es **15 días**. No calcular progresivo.
- El contador de años para el progresivo **nunca puede ser mayor** que los años en la empresa actual.
- Si el trabajador llegó con cotizaciones parciales, descontar del tiempo en empresa los años que necesitaba para llegar al umbral antes de dividir por 3.
- Si el resultado de la división tiene decimales, **siempre tomar el entero inferior** (ej: 7 ÷ 3 = 2.33 → usar 2).
- El mínimo de días de vacaciones anuales es siempre **15**. El progresivo solo suma, nunca resta.
- Informar siempre **cuántos años faltan** para el próximo día adicional, calculando cuánto le falta para completar el siguiente tramo de 3 años.
- **Permitir saldo negativo**: Entender que si se solicitan vacaciones adelantadas apenas inicia el periodo, el saldo disponible puede ser menor a cero.
- **Validar el límite de saldo negativo**: Rechazar o advertir si la solicitud implica acumular un saldo negativo que sobrepase los **15 días**.
- Tener en cuenta que el saldo actual se irá **reestableciendo** en base a la acumulación de días legales y progresivos a medida que transcurre el año.
