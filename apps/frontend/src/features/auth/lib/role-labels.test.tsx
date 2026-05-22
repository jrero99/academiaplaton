import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useRoleLabels, useRoleLabelsArray, useRoleSubline } from './role-labels';

// ── helper genérico ───────────────────────────────────────────────────────────

function RoleLabelsConsumer() {
  const labels = useRoleLabels();
  return (
    <ul>
      <li data-testid="admin">{labels.admin}</li>
      <li data-testid="center_manager">{labels.center_manager}</li>
      <li data-testid="teacher">{labels.teacher}</li>
    </ul>
  );
}

function RoleSublineConsumer({ roles }: { roles: Parameters<typeof useRoleSubline>[0] }) {
  const subline = useRoleSubline(roles);
  return <span data-testid="subline">{subline}</span>;
}

// Para cambiar de idioma en los tests usamos localStorage antes de render
const STORAGE_KEY = 'plato.language';

beforeEach(() => {
  localStorage.clear();
});

// ── useRoleLabels ─────────────────────────────────────────────────────────────

describe('useRoleLabels()', () => {
  it('debería devolver etiquetas en catalán por defecto', () => {
    render(
      <LanguageProvider>
        <RoleLabelsConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('admin').textContent).toBe('Administrador');
    expect(screen.getByTestId('center_manager').textContent).toBe('Responsable');
    expect(screen.getByTestId('teacher').textContent).toBe('Professor');
  });

  it('debería devolver etiquetas en castellano si el idioma es ES', () => {
    localStorage.setItem(STORAGE_KEY, 'es');

    render(
      <LanguageProvider>
        <RoleLabelsConsumer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('admin').textContent).toBe('Administrador');
    expect(screen.getByTestId('center_manager').textContent).toBe('Responsable');
    expect(screen.getByTestId('teacher').textContent).toBe('Profesor');
  });
});

// ── useRoleLabelsArray ────────────────────────────────────────────────────────

function ArrayConsumer({ roles }: { roles: Parameters<typeof useRoleLabelsArray>[0] }) {
  const arr = useRoleLabelsArray(roles);
  return <span data-testid="array">{arr.join(',')}</span>;
}

describe('useRoleLabelsArray()', () => {
  it('debería mapear el array de roles a etiquetas en el orden correcto', () => {
    render(
      <LanguageProvider>
        <ArrayConsumer roles={['admin', 'teacher']} />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('array').textContent).toBe('Administrador,Professor');
  });

  it('debería devolver array vacío para roles vacíos', () => {
    render(
      <LanguageProvider>
        <ArrayConsumer roles={[]} />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('array').textContent).toBe('');
  });
});

// ── useRoleSubline ────────────────────────────────────────────────────────────

describe('useRoleSubline()', () => {
  it('debería unir etiquetas con " · " en CA', () => {
    render(
      <LanguageProvider>
        <RoleSublineConsumer roles={['admin', 'teacher']} />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('subline').textContent).toBe('Administrador · Professor');
  });

  it('debería devolver una única etiqueta sin separador para un solo rol', () => {
    render(
      <LanguageProvider>
        <RoleSublineConsumer roles={['center_manager']} />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('subline').textContent).toBe('Responsable');
  });

  it('debería usar etiquetas en ES cuando el idioma es castellano', () => {
    localStorage.setItem(STORAGE_KEY, 'es');

    render(
      <LanguageProvider>
        <RoleSublineConsumer roles={['admin', 'teacher']} />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('subline').textContent).toBe('Administrador · Profesor');
  });
});
