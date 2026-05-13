import { Link as LinkIcon } from 'lucide-react';
import { Button } from '../../atoms/Button/Button.jsx';
import { api } from '../../../lib/api.js';
import './GoogleConnect.scss';

export function GoogleConnect({ onConnected }) {
  async function handleConnect() {
    const { url } = await api.googleConnect();
    const w = 520, h = 640;
    const left = window.screen.width / 2 - w / 2;
    const top  = window.screen.height / 2 - h / 2;
    const popup = window.open(url, 'google-oauth', `width=${w},height=${h},left=${left},top=${top}`);

    const timer = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(timer);
        const { connected } = await api.googleStatus();
        if (connected) onConnected();
      }
    }, 500);
  }

  return (
    <section className="organism-google-connect">
      <h2 className="organism-google-connect__title">Conecte seu Google Calendar</h2>
      <p className="organism-google-connect__body">
        Para visualizar e agendar compromissos, autorize o portal a acessar seu Google Calendar.
      </p>
      <Button onClick={handleConnect}>
        <LinkIcon size={16} /> Conectar Google Calendar
      </Button>
    </section>
  );
}
