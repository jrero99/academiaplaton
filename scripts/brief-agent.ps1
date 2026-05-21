#requires -Version 5.1
<#
.SYNOPSIS
    Genera un briefing para el agente front/back/domain con los TODOs / FIXMEs
    anyadidos (o, en modo domain, los commits que tocan el objeto de negocio)
    desde la ultima vez que se le briefeo.

.DESCRIPTION
    - Lee la fecha del ultimo briefing en .claude/agent-state/last-briefed-<agent>.txt
      (ISO-8601). Si no existe, usa "hace 7 dias" como fallback.
    - Recorre los commits desde esa fecha en las rutas relevantes al agente.
    - Modo front/back: extrae las lineas anyadidas (+) que contengan
      TODO / FIXME / HACK / XXX.
    - Modo domain: lista los commits que tocan schema.prisma, packages/shared/
      o CLAUDE.md con sus ficheros y autor. Sin escaneo de markers — el
      cambio EN SI ES la noticia que el resto de agentes necesita conocer.
    - Escribe el resultado en .claude/agent-state/briefing-<agent>.md (UTF-8).
    - Actualiza la fecha del ultimo briefing a "ahora" (salvo -NoUpdate).

    Pensado para correr automaticamente desde los scripts dev:frontend y
    dev:backend del package.json raiz. Los agentes leen su briefing al
    inicio de cada tarea; el briefing domain lo leen TODOS los agentes.

.PARAMETER Agent
    "front", "back" o "domain". Define que rutas se escanean y que fichero
    se escribe.

.PARAMETER NoUpdate
    Si se pasa, NO actualiza la fecha. Util para inspeccionar sin consumir
    la ventana temporal.

.EXAMPLE
    powershell -File scripts/brief-agent.ps1 -Agent front
    powershell -File scripts/brief-agent.ps1 -Agent back -NoUpdate
    powershell -File scripts/brief-agent.ps1 -Agent domain
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('front', 'back', 'domain')]
    [string]$Agent,

    [switch]$NoUpdate
)

# No bloqueamos el arranque del dev server si algo falla aqui dentro.
$ErrorActionPreference = 'Continue'

try {
    $repoRoot  = Split-Path -Parent $PSScriptRoot
    $stateDir  = Join-Path $repoRoot '.claude\agent-state'
    $stampFile = Join-Path $stateDir "last-briefed-$Agent.txt"
    $briefFile = Join-Path $stateDir "briefing-$Agent.md"

    if (-not (Test-Path $stateDir)) {
        New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    }

    # Rutas relevantes por agente
    $paths = switch ($Agent) {
        'front'  { @('apps/frontend', 'packages/shared') }
        'back'   { @('apps/backend',  'packages/shared') }
        'domain' { @('apps/backend/prisma/schema.prisma', 'packages/shared', 'CLAUDE.md') }
    }

    # Fecha del ultimo briefing (ISO-8601). Default: hace 7 dias.
    if (Test-Path $stampFile) {
        $sinceRaw = (Get-Content $stampFile -Raw).Trim()
        try {
            $since = [datetime]::Parse($sinceRaw, [Globalization.CultureInfo]::InvariantCulture)
        } catch {
            Write-Warning "Fecha invalida en $stampFile ('$sinceRaw'). Usando hace 7 dias."
            $since = (Get-Date).AddDays(-7)
        }
    } else {
        $since = (Get-Date).AddDays(-7)
    }

    $sinceIso = $since.ToString('o', [Globalization.CultureInfo]::InvariantCulture)
    $nowIso   = (Get-Date).ToString('o', [Globalization.CultureInfo]::InvariantCulture)

    Write-Host "[brief-agent:$Agent] desde $sinceIso" -ForegroundColor Cyan

    # Verifica que estemos en un repo git
    $gitCheck = & git -C $repoRoot rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -ne 0 -or $gitCheck -notmatch 'true') {
        Write-Warning "[brief-agent:$Agent] No es un repo git. Salto sin briefing."
        exit 0
    }

    # Recoge diff de commits desde la fecha en las rutas relevantes
    $gitArgs = @(
        '-C', $repoRoot,
        'log',
        "--since=$sinceIso",
        '--no-merges',
        '--pretty=format:__COMMIT__%h|%ad|%an|%s',
        '--date=iso-strict',
        '-p',
        '--unified=0',
        '--'
    ) + $paths

    $logOutput = & git @gitArgs 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "[brief-agent:$Agent] git log fallo. Salto."
        exit 0
    }

    # Parseo: una pasada anotando commit, fichero y numero de linea en el fichero NUEVO.
    # En modo domain solo necesitamos commits + ficheros tocados (sin escaneo de markers).
    $findings      = New-Object System.Collections.Generic.List[object]   # solo front/back
    $domainCommits = New-Object System.Collections.Generic.List[object]   # solo domain
    $currentCommit = $null
    $currentFile   = $null
    $currentLine   = 0
    $currentDomainEntry = $null

    foreach ($line in ($logOutput -split "`n")) {
        if ($line.StartsWith('__COMMIT__')) {
            $parts = $line.Substring(10).Split('|', 4)
            $currentCommit = [pscustomobject]@{
                Sha     = $parts[0]
                Date    = $parts[1]
                Author  = $parts[2]
                Subject = if ($parts.Length -gt 3) { $parts[3] } else { '' }
            }
            $currentFile = $null

            if ($Agent -eq 'domain') {
                $currentDomainEntry = [pscustomobject]@{
                    Sha     = $currentCommit.Sha
                    Date    = $currentCommit.Date
                    Author  = $currentCommit.Author
                    Subject = $currentCommit.Subject
                    Files   = New-Object System.Collections.Generic.List[string]
                }
                $domainCommits.Add($currentDomainEntry) | Out-Null
            }
            continue
        }

        if ($line.StartsWith('diff --git ')) {
            $m = [regex]::Match($line, '^diff --git a/(.+?) b/(.+)$')
            if ($m.Success) { $currentFile = $m.Groups[2].Value }
            $currentLine = 0

            if ($Agent -eq 'domain' -and $currentDomainEntry -and $currentFile) {
                if (-not $currentDomainEntry.Files.Contains($currentFile)) {
                    $currentDomainEntry.Files.Add($currentFile) | Out-Null
                }
            }
            continue
        }

        # El resto solo lo procesamos en modo marker (front/back)
        if ($Agent -eq 'domain') { continue }

        if ($line.StartsWith('@@')) {
            $m = [regex]::Match($line, '^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@')
            if ($m.Success) { $currentLine = [int]$m.Groups[1].Value }
            continue
        }

        if ($line.StartsWith('+') -and -not $line.StartsWith('+++')) {
            $content = $line.Substring(1)
            if ($content -match '(TODO|FIXME|HACK|XXX)\b') {
                if ($currentCommit -and $currentFile) {
                    $findings.Add([pscustomobject]@{
                        File    = $currentFile
                        Line    = $currentLine
                        Marker  = $Matches[1]
                        Text    = $content.Trim()
                        Sha     = $currentCommit.Sha
                        Date    = $currentCommit.Date
                        Author  = $currentCommit.Author
                        Subject = $currentCommit.Subject
                    }) | Out-Null
                }
            }
            $currentLine++
            continue
        }
    }

    # Render markdown (solo ASCII en el source; la salida es UTF-8)
    $lines = New-Object System.Collections.Generic.List[string]
    [void]$lines.Add("# Briefing automatico - agente platon$Agent")
    [void]$lines.Add("")
    [void]$lines.Add("- **Generado**: $nowIso")
    [void]$lines.Add("- **Ventana**: desde $sinceIso")
    [void]$lines.Add("- **Rutas escaneadas**: $($paths -join ', ')")

    if ($Agent -eq 'domain') {
        [void]$lines.Add("- **Commits que tocan el modelo de negocio**: $($domainCommits.Count)")
        [void]$lines.Add("")

        if ($domainCommits.Count -eq 0) {
            [void]$lines.Add("_Sin cambios al objeto de negocio en la ventana. Modelo estable._")
        } else {
            [void]$lines.Add("## Cambios al objeto de negocio")
            [void]$lines.Add("")
            [void]$lines.Add("Lo lee cualquier agente (front, back, test, sec, qa) antes de tocar nada.")
            [void]$lines.Add("Estos commits modifican `schema.prisma`, `packages/shared/` o `CLAUDE.md`,")
            [void]$lines.Add("asi que afectan al contrato compartido entre capas. Asume que cualquier")
            [void]$lines.Add("DTO, entidad o relacion mencionada aqui puede haber cambiado.")
            [void]$lines.Add("")

            foreach ($c in $domainCommits) {
                $shortSubject = if ($c.Subject.Length -gt 80) { $c.Subject.Substring(0, 77) + '...' } else { $c.Subject }
                [void]$lines.Add("### ``$($c.Sha)`` $shortSubject")
                [void]$lines.Add("")
                [void]$lines.Add("- **Fecha**: $($c.Date)")
                [void]$lines.Add("- **Autor**: $($c.Author)")
                [void]$lines.Add("- **Ficheros tocados**:")
                foreach ($f in $c.Files) {
                    [void]$lines.Add("  - ``$f``")
                }
                [void]$lines.Add("")
            }
        }
    } else {
        [void]$lines.Add("- **TODO / FIXME / HACK / XXX nuevos**: $($findings.Count)")
        [void]$lines.Add("")

        if ($findings.Count -eq 0) {
            [void]$lines.Add("_Sin nuevos marcadores en la ventana. Nada nuevo de lo que avisar._")
        } else {
            [void]$lines.Add("## Marcadores nuevos")
            [void]$lines.Add("")
            [void]$lines.Add("Lee cada uno antes de planificar cambios en su zona. Si el ticket sigue")
            [void]$lines.Add("vigente, considera abordarlo en la misma tarea si es coherente.")
            [void]$lines.Add("")

            $byFile = $findings | Group-Object File
            foreach ($g in $byFile) {
                [void]$lines.Add("### $($g.Name)")
                [void]$lines.Add("")
                foreach ($f in $g.Group) {
                    $shortSubject = if ($f.Subject.Length -gt 60) { $f.Subject.Substring(0, 57) + '...' } else { $f.Subject }
                    [void]$lines.Add("- **L$($f.Line)** [$($f.Marker)] $($f.Text)")
                    [void]$lines.Add("  - commit ``$($f.Sha)`` | $($f.Date) | $($f.Author) - $shortSubject")
                }
                [void]$lines.Add("")
            }
        }
    }

    [void]$lines.Add("---")
    [void]$lines.Add("_Briefing generado por scripts/brief-agent.ps1. No editar a mano._")
    [void]$lines.Add("_Forzar regeneracion: ``pnpm run brief:$Agent``._")

    # Escribe UTF-8 sin BOM
    [System.IO.File]::WriteAllText($briefFile, ($lines -join "`r`n"), (New-Object System.Text.UTF8Encoding($false)))

    $itemCount = if ($Agent -eq 'domain') { $domainCommits.Count } else { $findings.Count }
    $itemLabel = if ($Agent -eq 'domain') { 'commits' } else { 'marcadores' }
    Write-Host "[brief-agent:$Agent] $itemCount $itemLabel -> $briefFile" -ForegroundColor Green

    if (-not $NoUpdate) {
        [System.IO.File]::WriteAllText($stampFile, $nowIso, (New-Object System.Text.UTF8Encoding($false)))
    }

    exit 0
}
catch {
    Write-Warning "[brief-agent:$Agent] Error inesperado: $_"
    # Nunca rompemos el arranque del dev server por el briefing
    exit 0
}
