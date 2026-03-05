# TaskLine + IPC Integration Runbook

This runbook covers local integration setup, diagnostics, and smoke validation for IPC <-> TaskLine compatibility.

## 1) Startup Modes

### IPC only

```bash
docker compose up --build -d
```

### IPC + TaskLine fullstack

```bash
docker compose --profile fullstack up --build -d
```

Expected URLs:
- IPC app: `http://localhost:5173`
- IPC API: `http://localhost:3001`
- TaskLine app/API: `http://localhost:3002`

## 2) Required Environment Variables

See `.env.example`.

- `TASKLINE_URL`: IPC server-side TaskLine target (Docker fullstack default: `http://taskline:3000`)
- `IPC_URL`: IPC app URL used for metadata backlinks
- `VITE_TASKLINE_APP_URL`: browser deep-link base for TaskLine links

## 3) Built-In Connectivity Diagnostic

Use the tRPC query:

- `sync.connectionStatus`

Returns:
- `ok`
- `tasklineUrl`
- `appUrl`
- `checks[]` by required procedure
- `errorClass`: `unreachable | wrong_backend | contract_mismatch | unknown`
- `userMessage`

UI surfaces:
- Projects page warning banner
- Project detail warning near sync controls
- Sync settings status row

## 4) Smoke Validation

Run end-to-end integration smoke:

```bash
npm run smoke:taskline
```

The smoke script validates:
1. IPC health endpoint
2. `sync.connectionStatus.ok === true`
3. `sync.listTasklineProjects` shape/non-crash behavior
4. temp IPC project create -> `sync.pushToTaskline`
5. `sync.status` linked verification
6. `sync.receiveFromTaskline` idempotent update path
7. `spreadsheetSync.roundTripCheck` non-regression
8. cleanup of temporary IPC + TaskLine records

## 5) Troubleshooting

### Wrong backend on configured port

Symptoms:
- `sync.connectionStatus.errorClass = wrong_backend`
- TaskLine import/push buttons are disabled

Fix:
- Ensure TaskLine is running on the intended port (`3002` by default).
- Verify `TASKLINE_URL` in IPC environment points to TaskLine, not another app.

### TaskLine unreachable

Symptoms:
- `errorClass = unreachable`
- connection warnings visible in UI

Fix:
- Start TaskLine (`--profile fullstack` or external TaskLine service).
- Confirm network route and port.

### Contract mismatch

Symptoms:
- `errorClass = contract_mismatch`
- failed procedures listed in `checks`

Fix:
- Verify TaskLine version exposes expected procedures:
  - `projects.list`, `projects.getById`, `projects.create`, `projects.update`
  - `templates.list`, `templates.create`
  - `tasks.listByProject`, `tasks.update`
