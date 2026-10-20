# Verificación previa al despliegue

Fecha: 20 de octubre de 2026. Modelo: RUDA v8. Entorno comprobado: Windows, Node.js 24 y PostgreSQL 17 local.

## Resultado local

La compilación de producción terminó correctamente y la verificación previa registró **33 pruebas automatizadas aprobadas y ninguna fallida**. Las pruebas de integración utilizaron bases temporales aisladas de los registros de trabajo.

Se verificaron migraciones y seed repetibles, contrato v8, autenticación, aislamiento entre funcionarios, borradores, cierre, concurrencia, transacciones, eventos compartidos, integrantes, animales y bienes repetidos, módulo étnico, archivos de acta y estadísticas. Las pruebas del adaptador comprobaron rutas de API, cookies de producción y validación de orígenes.

En navegador se comprobó el recorrido principal: acceso, modo claro, búsqueda, eventos, estadísticas, creación, guardado, revisión de integrante, narración breve con guías opcionales, cierre, recarga y reapertura. También se comprobó el acceso del segundo funcionario sin los registros del primero.

Los archivos PDF/PNG/JPEG se validaron por API: 4 MiB aceptados, un byte adicional rechazado, descarga exacta, conservación entre guardados y eliminación. Las pruebas incluyeron fechas imposibles, valores numéricos fuera de rango y municipios inválidos.

## Reproducción

```powershell
npm test
npm run test:api
npm run test:predeploy
```

La verificación completa requiere PostgreSQL local y permiso de creación de bases temporales. El ejecutor elimina su base de prueba al finalizar. No apuntar estas pruebas a Neon.

## Límites

La compilación presenta una advertencia por superar el presupuesto inicial de 500 kB; no impide el build. No se ha verificado exhaustivamente cada combinación de navegador o tamaño de pantalla.

El resultado local no sustituye la comprobación del despliegue: verificar la conexión real a Neon, acceso HTTPS, cookies, guardado, cierre, aislamiento y archivos en la URL definitiva de Vercel. Este informe no afirma que esas verificaciones remotas ya se hayan completado.
