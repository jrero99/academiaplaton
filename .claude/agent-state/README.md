# `.claude/agent-state/`

Estado local de los briefings automáticos para los agentes `platon*`.

## Qué hay aquí

- `last-briefed-front.txt`, `last-briefed-back.txt`, `last-briefed-domain.txt` — fecha ISO-8601 del último briefing generado para cada vertical.
- `briefing-front.md`, `briefing-back.md` — briefings de **marcadores**: TODO/FIXME/HACK/XXX añadidos desde la fecha anterior en las rutas relevantes a cada vertical.
- `briefing-domain.md` — briefing de **modelo de negocio**: commits desde la fecha anterior que tocan `apps/backend/prisma/schema.prisma`, `packages/shared/**` o `CLAUDE.md`. Sin filtro por contenido — el cambio en sí es la noticia.

Estos ficheros **no se commitean** (ver `.gitignore` de este directorio). Cada máquina tiene su propia ventana temporal.

## Cómo se regeneran

Automáticamente al arrancar los servidores de desarrollo (hooks `predev:*` en el `package.json` raíz):

```bash
pnpm dev:frontend   # → regenera briefing-front.md + briefing-domain.md
pnpm dev:backend    # → regenera briefing-back.md  + briefing-domain.md
```

Manualmente:

```powershell
pwsh -File scripts/brief-agent.ps1 -Agent front
pwsh -File scripts/brief-agent.ps1 -Agent back
pwsh -File scripts/brief-agent.ps1 -Agent domain
pwsh -File scripts/brief-agent.ps1 -Agent front -NoUpdate   # inspecciona sin consumir la ventana
```

O vía pnpm:

```bash
pnpm brief:front
pnpm brief:back
pnpm brief:domain
```

## Cómo lo consumen los agentes

Cada definición de agente (`platonFront`, `platonBack`, `platonTest`, `platonSecFront`, `platonQA`) instruye al modelo a leer su briefing relevante antes de cualquier tarea, MÁS `briefing-domain.md`. El de dominio lo leen TODOS los agentes para que ningún cambio al objeto de negocio se procese con un modelo desactualizado.

Convención:
- Si vas a tocar una zona con un marcador vigente, tenlo presente y ofrécete a abordarlo si encaja en la tarea.
- Si el briefing de dominio reporta un cambio en una entidad que vas a usar, asume que su DTO/relaciones pueden haber cambiado y comprueba antes de escribir código.
- No "limpies" marcadores sin pedir confirmación al usuario.
- No menciones los briefings en tu respuesta final salvo que sea relevante para lo entregado.
