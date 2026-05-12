import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import platoLogo from '@/assets/logo/plato-logo.svg';
import { Button } from '@/components/ui/button';

export function WelcomePage() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-10 p-8 bg-background text-foreground">
      <header className="flex flex-col items-center gap-6 text-center">
        <img
          src={platoLogo}
          alt="Plató · Centre d'estudis"
          className="h-24 sm:h-32 w-auto"
        />
        <p className="text-muted-foreground max-w-md text-sm">
          CRM SaaS · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Montserrat
        </p>
      </header>

      <Button asChild size="lg">
        <Link to="/admin">
          Ir al panel de administración
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </main>
  );
}
