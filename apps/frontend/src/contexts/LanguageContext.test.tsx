import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useLanguage, useTranslation } from './LanguageContext';
import { DEFAULT_LANGUAGE } from '@/i18n/dictionaries';

// ── helpers ──────────────────────────────────────────────────────────────────

function TestConsumer() {
  const { language, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="dashboard">{t('nav.dashboard')}</span>
    </div>
  );
}

function TestSetter() {
  const { setLanguage } = useLanguage();
  return (
    <button onClick={() => setLanguage('es')}>switch</button>
  );
}

function TestOutsideProvider() {
  useTranslation();
  return null;
}

const STORAGE_KEY = 'plato.language';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── LanguageProvider ──────────────────────────────────────────────────────────

describe('LanguageProvider', () => {
  it('debería cargar CA por defecto si no hay valor en localStorage', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('ca');
  });

  it('debería cargar ES si localStorage contiene "es"', () => {
    localStorage.setItem(STORAGE_KEY, 'es');

    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('es');
  });

  it('debería caer a CA si localStorage contiene un valor inválido', () => {
    localStorage.setItem(STORAGE_KEY, 'fr');

    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe(DEFAULT_LANGUAGE);
  });

  it('debería caer a CA si localStorage contiene una cadena vacía', () => {
    localStorage.setItem(STORAGE_KEY, '');

    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe(DEFAULT_LANGUAGE);
  });

  it('debería persistir en localStorage al llamar setLanguage', async () => {
    render(
      <LanguageProvider>
        <TestConsumer />
        <TestSetter />
      </LanguageProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('es');
  });

  it('debería actualizar document.documentElement.lang al cambiar idioma', async () => {
    render(
      <LanguageProvider>
        <TestConsumer />
        <TestSetter />
      </LanguageProvider>,
    );

    // Tras montar, el efecto fija el idioma inicial (CA)
    expect(document.documentElement.lang).toBe('ca');

    await userEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(document.documentElement.lang).toBe('es');
  });

  it('debería traducir nav.dashboard a Tauler en CA', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('dashboard').textContent).toBe('Tauler');
  });

  it('debería traducir nav.dashboard a Dashboard en ES', () => {
    localStorage.setItem(STORAGE_KEY, 'es');

    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('dashboard').textContent).toBe('Dashboard');
  });
});

// ── useTranslation fuera de Provider ─────────────────────────────────────────

describe('useTranslation fuera del Provider', () => {
  it('debería lanzar un error descriptivo', () => {
    // Suprimimos el error de React en consola durante el test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(<TestOutsideProvider />),
    ).toThrowError('useLanguage must be used within LanguageProvider');

    spy.mockRestore();
  });
});
