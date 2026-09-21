/**
 * Resolucao de periodos no fuso do negocio.
 *
 * O problema que isto resolve: `new Date().toISOString()` devolve a data em
 * UTC. As 21h de Brasilia ja e o dia seguinte em UTC, entao "hoje" passava a
 * apontar para uma data futura (sem dados) e "ontem" caia no dia corrente.
 *
 * Usar o fuso do servidor tambem nao serve: em desenvolvimento ele e o do
 * Windows do usuario, e na Vercel e UTC. O fuso precisa ser o do negocio — o
 * mesmo em que o Meta reporta (o breakdown e por fuso da conta de anuncios) e
 * em que a planilha de vendas registra os horarios.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * A data de calendario do fuso do negocio, representada como meia-noite UTC.
 *
 * Guardar como meia-noite UTC deixa a aritmetica de dias e meses imune a
 * horario de verao: so o calendario importa daqui para frente.
 */
export function startOfToday(now: Date = new Date()): Date {
  const parts = dayFormatter.formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

/** Formata como YYYY-MM-DD. Espera uma data vinda de startOfToday/addDays. */
export function formatDay(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export interface DateRange {
  dateStart?: string;
  dateEnd?: string;
}

/**
 * Converte o periodo escolhido na interface em um intervalo YYYY-MM-DD.
 *
 * `fallback` e usado quando nao ha periodo nomeado (datas soltas na query) ou
 * quando o periodo nao e reconhecido. 'maximum' zera o intervalo de proposito,
 * para nao filtrar nada.
 */
export function resolvePeriod(period: string | null, fallback: DateRange = {}): DateRange {
  if (!period) return fallback;

  const today = startOfToday();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  const range = (start: Date, end: Date): DateRange => ({
    dateStart: formatDay(start),
    dateEnd: formatDay(end),
  });

  switch (period) {
    case 'today':
      return range(today, today);
    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return range(yesterday, yesterday);
    }
    case 'last_7_days':
      return range(addDays(today, -6), today);
    case 'last_14_days':
      return range(addDays(today, -13), today);
    case 'last_30_days':
      return range(addDays(today, -29), today);
    case 'this_month':
      // Dia 0 do mes seguinte e o ultimo dia deste mes.
      return range(new Date(Date.UTC(year, month, 1)), new Date(Date.UTC(year, month + 1, 0)));
    case 'last_month':
      return range(new Date(Date.UTC(year, month - 1, 1)), new Date(Date.UTC(year, month, 0)));
    case 'maximum':
      return { dateStart: undefined, dateEnd: undefined };
    default:
      return fallback;
  }
}
