function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function toSlugLike(s: string): string {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Inicial del nombre + primer apellido (la palabra antes del primer espacio
// del lastName), sin tildes, en minúsculas.
//   "Juan Pérez García"     → "jperez"
//   "Núria Codina Mir"      → "ncodina"
export function buildUsername(firstName: string, lastName: string): string {
  const initial = toSlugLike(firstName).slice(0, 1);
  const surname = toSlugLike(lastName.split(/\s+/)[0] ?? '');
  return `${initial}${surname}`;
}

// Si el username ya existe, añade un sufijo numérico incremental.
//   ("jsala", ["jsala"])        → "jsala2"
//   ("jsala", ["jsala","jsala2"]) → "jsala3"
export function uniqueUsername(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}
