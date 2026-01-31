# EcoDrive Planner eMob (EDP-eMob)

EcoDrive Planner eMob (EDP-eMob) is a modular **web-based software platform** for the **planning, management, and visualization of sustainable road routes**, oriented towards **electric, hybrid, and plug-in hybrid vehicles**. The platform supports interactive route definition, vehicle profile management, route segmentation and geographic enrichment (e.g., elevation), and the generation and inspection of sustainable driving strategies through an optimization model executed on the backend.

EDP-eMob is designed as a reusable and extensible framework for **research and experimentation in sustainable mobility**, enabling integration of custom analytical or optimization components through its REST API and modular backend architecture.

---

## Key features

- Vehicle profile management with physical and energy-related parameters.
- Interactive route definition using a map-based interface.
- Route segmentation and enrichment with elevation and slope data.
- Generation of sustainable driving strategies via optimization algorithms.
- Detailed visualization of results (tables, summaries, and map overlays).

---

## Architecture overview

EDP-eMob follows a **decoupled frontend–backend architecture**:

- **Frontend**: React + Vite + Leaflet.
- **Backend**: Python + FastAPI, including a model execution engine.
- **Database**: MongoDB.
- **External services**: OSRM (routing) and OpenTopoData (elevation).

---

## Requirements

### Docker (recommended)
- Docker
- Docker Compose

### Development (without Docker)
- Backend: Python >= 3.9, MongoDB
- Frontend: Node.js >= 18

---

## Quick start

### Start services

```bash
docker-compose up --build
```

This will start:
- MongoDB at `localhost:27017`
- Backend at `http://localhost:8000`
- Frontend at `http://localhost:5173`

### Stop services

```bash
docker-compose down
```

---

## Typical usage workflow

1. Create a vehicle profile.
2. Define and store a route using the interactive map.
3. Generate solutions using the optimization engine.
4. Analyze results through tables and map visualizations.

---

## Repository structure (simplified)

```
.
|-- docker-compose.yml
|-- Dockerfile.backend
|-- Dockerfile.frontend
|-- backend/
|-- frontend/
|-- mongodb/
```

---

## License

This project is licensed under the MIT License.

---

## Citation

If you use this software in academic work, please cite the accompanying SoftwareX article.

Coming soon...

---

## Contact

For questions or support, contact:
juan.detorre@uca.es
