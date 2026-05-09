/** Datos de demostración hasta conectar Builderbot / WhatsApp. */

export type MensajeThread = {
  id: string;
  contacto: string;
  telefono: string;
  ultimoPreview: string;
  ultimoEn: string;
  canal: 'whatsapp';
  direccion: 'outbound' | 'inbound';
  estado: 'abierto' | 'cerrado' | 'pendiente';
  transcript: string;
};

const longTranscript = (nombre: string) => `Sistema: conversación ${nombre} — vista previa de transcripción extensa.

[09:02] Bot: Hola, te escribimos desde NutryHome por tu pedido de insumos. ¿Podés confirmar recepción o fecha de entrega?

[09:04] Usuario: Hola, sí. El viernes pasaron y dejaron todo en portería.

[09:05] Bot: Perfecto. ¿Podés indicar el domicilio de entrega registrado y si coincidió con lo pedido?

[09:07] Usuario: Sí, es Av. Siempre Viva 742. Trajeron producto1 y producto2 en las cantidades que pedí.

[09:08] Bot: Gracias. ¿Alguna observación para el equipo logístico?

[09:11] Usuario: No, todo bien. Gracias.

[09:12] Bot: Registramos la confirmación. Que tengas buen día.

---

(Fin del fragmento demo; al integrar Builderbot esta transcripción vendrá del historial de mensajes del canal.)

${'Línea de continuidad para scroll en UI de prueba. '.repeat(40)}`;

export const DEMO_THREADS: MensajeThread[] = [
  {
    id: 'demo-wa-1',
    contacto: 'ZAPELLA, SERGIO',
    telefono: '+5491150051117',
    ultimoPreview: 'Confirmación de entrega — sin incidencias.',
    ultimoEn: '2025-09-26T17:44:00',
    canal: 'whatsapp',
    direccion: 'outbound',
    estado: 'cerrado',
    transcript: longTranscript('ZAPELLA, SERGIO'),
  },
  {
    id: 'demo-wa-2',
    contacto: 'RENDINO LAURA',
    telefono: '+5492226554433',
    ultimoPreview: 'Paciente consulta por segundo envío del mes.',
    ultimoEn: '2025-09-25T11:20:00',
    canal: 'whatsapp',
    direccion: 'inbound',
    estado: 'abierto',
    transcript: longTranscript('RENDINO LAURA'),
  },
  {
    id: 'demo-wa-3',
    contacto: 'GÓMEZ MARTÍN',
    telefono: '+5492233110044',
    ultimoPreview: 'Lote programado; pendiente de respuesta.',
    ultimoEn: '2025-09-24T09:00:00',
    canal: 'whatsapp',
    direccion: 'outbound',
    estado: 'pendiente',
    transcript: longTranscript('GÓMEZ MARTÍN'),
  },
];

export function getThreadById(id: string): MensajeThread | undefined {
  return DEMO_THREADS.find((t) => t.id === id);
}
