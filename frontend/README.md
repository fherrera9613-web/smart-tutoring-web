# SMART Tutoring Center · Panel administrativo

React + Vite, solo frontend (sin backend).

```bash
npm install
npm run dev   # http://localhost:5173
```

- `src/pages/Login.jsx`: acceso con validación de correo y contraseña.
- `src/pages/Dashboard.jsx`: resumen administrativo y vistas de estudiantes, profesores, familias/cobros, programación y agenda diaria.
- `src/styles/global.css`: estilos responsive del acceso y del panel.

El acceso y las pantallas usan datos de demostración. Cualquier correo con formato válido y contraseña de al menos 6 caracteres permite entrar; todavía no hay autenticación, persistencia ni conexión a una API. Las acciones de registro, cobro y notificación requieren conectar el backend.
