# API Contract for Docker Crafter

This document defines the API endpoints and WebSocket protocols for the Docker Crafter application.

## Endpoints

### 1. Get Project Workspaces
- **Method:** `GET`
- **Path:** `/api/v1/projects`
- **Description:** Retrieves the list of project workspaces, aggregated by project dimension, including real-time container metrics.
- **Request Parameters:** None
- **Response Format:**
  ```json
  [
    {
      "projectName": "string",
      "isCompose": true,
      "containers": [
        {
          "id": "string",
          "name": "string",
          "image": "string",
          "state": "string",
          "status": "string",
          "ports": ["string"],
          "labels": {
            "key": "value"
          },
          "cpuUsage": 0.0,
          "memoryUsage": 0,
          "memoryLimit": 0
        }
      ],
      "engineName": "string"
    }
  ]
  ```

### 2. Single Container Action
- **Method:** `POST`
- **Path:** `/api/v1/containers/:id/action`
- **Description:** Performs an action (start, stop, restart) on a single container specified by ID.
- **Request Body (JSON):**
  ```json
  {
    "action": "start | stop | restart"
  }
  ```
- **Response Format:**
  - `200 OK` on success.
  - `400 Bad Request` if action is invalid.
  - `500 Internal Server Error` on execution failure.

### 3. Get Container Logs (HTTP)
- **Method:** `GET`
- **Path:** `/api/v1/containers/:id/logs`
- **Description:** Fetches the logs for a specific container via HTTP.
- **Query Parameters:**
  - `tail` (string, optional): Number of log lines to retrieve (e.g., "100").
- **Response Format:**
  - Raw text logs (`text/plain`).

### 4. Stream Container Logs (WebSocket)
- **Method:** `WS` (WebSocket)
- **Path:** `/api/v1/containers/:id/logs/stream`
- **Description:** Streams real-time logs for a specific container via WebSocket.
- **Query Parameters:**
  - `tail` (string, optional): Number of initial log lines to retrieve before streaming new lines (e.g., "100").
- **WebSocket Protocol (Backend to Frontend):**
  ```json
  { "type": "stdout", "data": "line of log..." }
  { "type": "stderr", "data": "error line..." }
  ```

### 5. Execute Command in Container
- **Method:** `POST`
- **Path:** `/api/v1/containers/:id/exec`
- **Description:** Executes a command inside the specified container.
- **Request Body (JSON):**
  ```json
  {
    "cmd": ["ls", "-la"]
  }
  ```
- **Response Format:**
  ```json
  {
    "stdout": "string",
    "stderr": "string",
    "exitCode": 0
  }
  ```

### 6. Terminal via WebSocket
- **Method:** `WS` (WebSocket)
- **Path:** `/api/v1/containers/:id/terminal`
- **Description:** Opens an interactive web terminal to a specific container via WebSocket.
- **Query Parameters:**
  - `shell` (string, optional): The shell to execute (e.g., `bash`, `sh`). Default may be inferred.
- **WebSocket Protocol:**
  - **Frontend to Backend (JSON):**
    ```json
    { "type": "input", "data": "ls -la\n" }
    { "type": "resize", "cols": 80, "rows": 24 }
    ```
  - **Backend to Frontend:**
    - Raw binary stream (BinaryMessage `messageType=2`) containing terminal output.

### 7. Docker Events Stream (WebSocket)
- **Method:** `WS` (WebSocket)
- **Path:** `/api/v1/events`
- **Description:** Subscribes to real-time Docker lifecycle events via WebSocket.
- **WebSocket Protocol (Backend to Frontend):**
  ```json
  {
    "action": "start | stop | die | destroy | pause | unpause | rename",
    "actorId": "string (container ID)",
    "engineName": "string"
  }
  ```

---
*Note: The existing endpoints `GET /api/v1/containers` and `POST /api/v1/containers/action` (for batch operations) are maintained for backward compatibility and are outside the scope of this newly defined contract set.*