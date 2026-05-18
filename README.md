# 💰 AI Personal Finance Manager (Python POO)

Un gestor de finanzas personales robusto desarrollado en Python, diseñado bajo el paradigma de **Programación Orientada a Objetos (POO)** y utilizando estructuras de datos jerárquicas (árboles) con procesamiento recursivo.

## 🚀 Características Técnicas

- **Arquitectura de Árboles:** Organización de finanzas mediante Categorías que pueden contener Subcategorías y Transacciones de forma recursiva.
- **Recursión Aplicada:** - Cálculo dinámico de totales de gastos en toda la jerarquía.
  - Motor de búsqueda de transacciones por palabra clave.
  - Generación de reportes visuales con indentación jerárquica.
- **Persistencia de Datos:** Serialización y Deserialización automática en formato **JSON** para almacenamiento local.
- **Sistema CRUD Completo:** Interfaz de consola interactiva para Crear, Leer, Actualizar y Eliminar datos.
- **Robustez (Error Handling):** Manejo de excepciones (`try/except`) para garantizar una ejecución sin interrupciones ante entradas inválidas del usuario.

## 🛠️ Tecnologías Utilizadas

- **Lenguaje:** Python 3.10+
- **Librerías:** `json`, `os`, `datetime` (Nativas).
- **Paradigma:** OOP (Object-Oriented Programming).

## 📁 Estructura del Proyecto

- `models.py`: Contiene las clases `Category` y `Transaction` con toda la lógica de negocio y métodos recursivos.
- `app.py`: Interfaz de usuario (CLI) y controlador de persistencia de archivos.
- `data.json`: Almacén de datos (generado automáticamente).

## 💻 Instalación y Uso

1. Clona este repositorio.
2. Ejecuta el archivo principal:
   ```bash
   python3 app.py