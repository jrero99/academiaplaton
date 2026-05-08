function App() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-8 p-8">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Academia Platón CRM</h1>
        <p className="text-muted-foreground">
          Stack listo: React 19 · TypeScript · Tailwind v4 · shadcn/ui · Montserrat
        </p>
      </header>

      <section className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Próximos pasos</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>
            Añade un componente shadcn:{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded">
              pnpm dlx shadcn@latest add button
            </code>
          </li>
          <li>Define la paleta y rutas en <code className="bg-muted px-1.5 py-0.5 rounded">App.tsx</code></li>
          <li>Decide la estrategia de auth (pendiente en CLAUDE.md)</li>
        </ol>
      </section>
    </main>
  );
}

export default App;
