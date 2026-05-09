import { redirect } from 'next/navigation';

/** Entrada del módulo: bandeja por defecto. */
export default function MensajesIndexPage() {
  redirect('/mensajes/bandeja');
}
