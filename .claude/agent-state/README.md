# `.claude/agent-state/`

Estado local de los briefings automáticos para los agentes `platonFront` y `platonTest`.

## Qué hay aquí

- `last-briefed-front.txt`, `last-briefed-back.txt` — fecha ISO-8601 del último briefing generado para cada agente.
- `briefing-front.md`, `briefing-back.md` — briefing actual generado por `scripts/brief-agent.ps1`. Contiene los TODO/FIXME/HACK/XXX añadidos desde la fecha anterior, en las rutas relevantes al agente.

Estos ficheros **no se commitean** (ver `.gitignore` de este directorio). Cada máquina tiene su propia ventana temporal.

## Cómo se regeneran

Automáticamente al arrancar los servidores de desarrollo (hooks `predev:*` en el `package.json` raíz):

```bash
pnpm dev:frontend   # → regenera briefing-front.md y actualiza last-briefed-front.txt
pnpm dev:backend    # → regenera briefing-back.md  y actualiza last-briefed-back.txt
```

Manualmente:

```powershell
pwsh -File scripts/brief-agent.ps1 -Agent front
pwsh -File scripts/brief-agent.ps1 -Agent back
pwsh -File scripts/brief-agent.ps1 -Agent front -NoUpdate   # inspecciona sin consumir la ventana
```

## Cómo lo consumen los agentes

Las definiciones de `platonFront` y `platonTest` les indican que, antes de cualquier tarea, lean el briefing correspondiente si existe, y tengan en cuenta los marcadores listados para no proponer cambios que choquen con TODOs ya planificados.
