import { redirect } from 'next/navigation';

/** Redirige la ruta antigua al nuevo hub de Casos. */
export default function SeguimientoRedirectPage() {
  redirect('/casos');
}
