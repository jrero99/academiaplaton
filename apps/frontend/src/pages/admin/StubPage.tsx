import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { useTranslation } from '@/contexts/LanguageContext';

interface Props {
  // Alternativas: literal o clave i18n. App.tsx pasa titleKey;
  // callers antiguos pueden seguir usando title.
  title?: string;
  titleKey?: string;
}

export function StubPage({ title, titleKey }: Props) {
  const { t } = useTranslation();
  const resolved = titleKey ? t(titleKey) : (title ?? '');
  return (
    <>
      <PageHeader
        title={resolved}
        breadcrumbs={[{ label: t('breadcrumb.admin'), to: '/admin' }, { label: resolved }]}
      />
      <div className="rounded-lg border bg-card shadow-sm p-12 flex flex-col items-center justify-center text-center gap-3">
        <Construction className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">{resolved}</p>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('stub.empty_text')}
        </p>
      </div>
    </>
  );
}
