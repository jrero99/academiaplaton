import platoLogo from '@/assets/logo/plato-logo.svg';

function App() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-10 p-8 bg-background text-foreground">
      <header className="flex flex-col items-center gap-6 text-center">
        <img
          src={platoLogo}
          alt="Plató · Centre d'estudis"
          className="h-24 sm:h-32 w-auto"
        />
        <p className="text-muted-foreground max-w-md text-sm">
          CRM · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Montserrat
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
        <Swatch name="Burgundy" value="#691a37" className="bg-brand-burgundy text-brand-white" />
        <Swatch name="Cream" value="#f4cea1" className="bg-brand-cream text-brand-burgundy" />
        <Swatch name="Black" value="#000000" className="bg-brand-black text-brand-white" />
        <Swatch
          name="White"
          value="#ffffff"
          className="bg-brand-white text-brand-black border border-border"
        />
      </section>

      <section className="w-full max-w-md space-y-4 rounded-lg border bg-card text-card-foreground p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Próximos pasos</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>
            Añade un componente shadcn:{' '}
            <code className="bg-muted text-foreground px-1.5 py-0.5 rounded">
              pnpm dlx shadcn@latest add button
            </code>
          </li>
          <li>Define rutas y layout principal</li>
          <li>Decide la estrategia de auth (pendiente en CLAUDE.md)</li>
        </ol>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            Acción primaria
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition"
          >
            Acento
          </button>
        </div>
      </section>
    </main>
  );
}

interface SwatchProps {
  name: string;
  value: string;
  className?: string;
}

function Swatch({ name, value, className = '' }: SwatchProps) {
  return (
    <div className={`rounded-md p-4 text-xs font-medium ${className}`}>
      <div>{name}</div>
      <div className="opacity-70">{value}</div>
    </div>
  );
}

export default App;
