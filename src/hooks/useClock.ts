import { useEffect, useState } from 'react';

// Hora cheia de uma data: o relógio só "anda" quando ela muda
export const clockKey = (d: Date) => `${d.toDateString()} ${d.getHours()}`;

// A data e hora de agora, atualizada na virada de cada hora (e ao voltar para o app). Com o app aberto
// por dias, a saudação, o mês atual e o bloqueio dos meses futuros acompanham o relógio
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const check = () => setNow((prev) => (clockKey(prev) === clockKey(new Date()) ? prev : new Date()));
    const timer = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return now;
}
