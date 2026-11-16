// Horário de atendimento institucional: seg-sex, 8h-18h, fuso America/Bahia (UTC-3).
// Configurável depois via env; por enquanto fixo.

const BAHIA_OFFSET_HOURS = -3;
export const BUSINESS_HOURS = {
  days: [1, 2, 3, 4, 5], // Dom=0, Seg=1, ..., Sáb=6
  startHour: 8,
  endHour: 18, // intervalo [8, 18), portanto 17:59 ainda vale, 18:00 não
  tz: 'America/Bahia',
};

// Retorna { day, hour, minute } no fuso de Bahia, para um ISO qualquer.
export function toBahiaWallTime(dateIso) {
  const d = new Date(dateIso);
  const bahia = new Date(d.getTime() + BAHIA_OFFSET_HOURS * 3600 * 1000);
  return {
    day: bahia.getUTCDay(),
    hour: bahia.getUTCHours(),
    minute: bahia.getUTCMinutes(),
  };
}

// Verifica se uma data/hora (qualquer ISO) cai dentro do expediente.
export function isWithinBusinessHours(dateIso) {
  const { day, hour } = toBahiaWallTime(dateIso);
  if (!BUSINESS_HOURS.days.includes(day)) return false;
  if (hour < BUSINESS_HOURS.startHour) return false;
  if (hour >= BUSINESS_HOURS.endHour) return false;
  return true;
}

// Checa uma faixa [startsAt, endsAt): basta o início OU o fim caírem fora.
export function rangeOutsideBusinessHours(startsAt, endsAt) {
  // Se início fora, fora. Se fim passar do limite, também fora (ex.: começa 17:30, termina 19:00).
  if (!isWithinBusinessHours(startsAt)) return true;
  // Para o endsAt, testamos o momento imediatamente anterior (endsAt é exclusivo).
  const endMs = new Date(endsAt).getTime() - 60_000;
  if (!isWithinBusinessHours(new Date(endMs).toISOString())) return true;
  return false;
}

export function businessHoursDescription() {
  return 'segunda a sexta, das 8h às 18h (horário de Salvador/BA)';
}
