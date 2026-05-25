---
name: feedback-sessions
description: Correcciones y validaciones de Harvey sobre cómo trabajar en este proyecto
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0091cfee-fc4f-4ddb-b6ce-d84f633d82bf
---

**No hacer commits sin permiso explícito.**
**Why:** Harvey revisa visualmente en el emulador antes de aprobar. Un commit prematuro da falsa sensación de avance.
**How to apply:** Siempre terminar con "¿Lo pruebas y hacemos commit?" — nunca committear solo.

**No hacer push al remoto.**
**Why:** Harvey hace push manualmente desde su terminal. Es su decisión cuándo sube al repositorio.
**How to apply:** Nunca ejecutar `git push`. Solo `git commit`.

**No ocultar errores ni hacer código idempotente para evitarlos.**
**Why:** Harvey dijo explícitamente "prefiero enterarme de los errores y aprender de ellos". Ejemplo: no convertir schema SQL a idempotente cuando falla por política ya existente.
**How to apply:** Dejar que los errores sucedan y explicarlos. Solo hacer código defensivo cuando sea arquitectónicamente correcto, no para esconder problemas.

**Ir despacio en features complejas — confirmar antes de implementar.**
**Why:** Harvey paró una implementación del drawer diciendo "vamos más despacio" porque los supuestos estaban mal (ícono equivocado, solo funcionaba en una tab).
**How to apply:** Para features con múltiples componentes, describir el plan primero y esperar confirmación. No asumir.

**No marcar una feature como completa hasta que Harvey la pruebe en el emulador.**
**Why:** El código puede compilar sin errores pero tener bugs visuales o de interacción que solo se ven en el dispositivo.
**How to apply:** Después de implementar, decir explícitamente "pruébalo en el emulador y me cuentas" antes de sugerir commit.

**Diagnosticar antes de cambiar código cuando algo no funciona.**
**Why:** En el bug del drawer, Harvey describió el patrón exacto (primera tab siempre falla) que llevó al diagnóstico correcto. Si se hubiera cambiado código a ciegas se habría perdido tiempo.
**How to apply:** Cuando algo falla, hacer preguntas específicas sobre el comportamiento antes de proponer cambios.

**Para screenshots del emulador Android usar PowerShell, no Bash.**
**Why:** El redirect `>` en Bash corrompe archivos binarios en Windows.
**How to apply:** `adb shell screencap -p /sdcard/screenshot.png; adb pull /sdcard/screenshot.png screenshot.png` via PowerShell.

**FlatList y ScrollView necesitan `flex: 1` explícito dentro de contenedores flex.**
**Why:** Sin `flex: 1`, React Native no sabe cuánto espacio darle al componente scroll y recorta el contenido en lugar de hacerlo desplazable. El `paddingBottom` del tab bar debe ir en `contentContainerStyle`, no en el contenedor padre.
**How to apply:** Siempre que un FlatList o ScrollView sea hijo de un SafeAreaView/View con flex, agregarle `style={{ flex: 1 }}`. El padding inferior del inset va en `contentContainerStyle.paddingBottom`.

**En calculadoras: gráfica primero, números después.**
**Why:** Harvey validó explícitamente este orden — la comprensión visual precede a los datos exactos. "Me gusta... que chévere."
**How to apply:** En todas las pantallas de calculadora: GrowthChart → ResultCard → disclaimer. Nunca al revés.

**Nombres de herramientas en lenguaje cotidiano, no técnico.**
**Why:** Harvey no identificó el valor de "CAGR" ni "Hurdle Rate" hasta que se los explicaron. Los nombres técnicos crean fricción innecesaria.
**How to apply:** Usar lenguaje de pregunta o consecuencia: "¿Tu plata crece o solo aguanta?", "¿Cuánto te cuestan las comisiones en 20 años?". Reservar el nombre técnico para tooltips o subtítulos.
