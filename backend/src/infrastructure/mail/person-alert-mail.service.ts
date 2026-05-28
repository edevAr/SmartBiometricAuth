import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Repository } from 'typeorm';
import type { ContactRepositoryPort } from '@application/contacts/ports/contact.repository';
import { UserOrmEntity } from '@infrastructure/persistence/typeorm/user.orm-entity';

export type PersonDetectedMailPayload = {
  ownerAdminId: string;
  cameraId: string;
  /** Ej.: nombre e IP para el asunto y cuerpo */
  cameraDisplayName: string;
  personScore: number;
  modelId: string;
  /** Fotograma JPEG (opcional, se adjunta si no es demasiado grande) */
  captureBuffer?: Buffer;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type LocationLinkResult = {
  href: string;
  linkLabel: string;
  hasLocation: boolean;
};

/**
 * Envía correo a todos los contactos activos con email cuando el modelo detecta una persona.
 * Desactivar con MAIL_PERSON_ALERT_ENABLED=0. Credenciales solo por variables de entorno.
 */
@Injectable()
export class PersonAlertMailService {
  private readonly logger = new Logger(PersonAlertMailService.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly config: ConfigService,
    @Inject('ContactRepositoryPort')
    private readonly contacts: ContactRepositoryPort,
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
  ) {}

  private isMailEnabled(): boolean {
    const v = this.config.get<string>('MAIL_PERSON_ALERT_ENABLED', '0').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  private getOrCreateTransport(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }
    const host = this.config.get<string>('MAIL_SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.config.get<string>('MAIL_SMTP_PORT', '465'));
    const secureRaw = this.config.get<string>('MAIL_SMTP_SECURE', '1').toLowerCase();
    const secure = secureRaw === '1' || secureRaw === 'true' || secureRaw === 'yes';
    const user = this.config.get<string>('MAIL_SMTP_USER', '')?.trim() ?? '';
    let pass = this.config.get<string>('MAIL_SMTP_PASS', '') ?? '';
    pass = pass.replace(/\s+/g, '');
    if (!user || !pass) {
      this.logger.warn(
        'Correo de alertas: defina MAIL_SMTP_USER y MAIL_SMTP_PASS (p. ej. contraseña de aplicación Gmail sin espacios).',
      );
      return null;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    return this.transporter;
  }

  /**
   * Enlace a la app (página de emergencia) si MAIL_PUBLIC_BASE_URL está definida;
   * si no, enlace directo a OpenStreetMap con coordenadas o búsqueda por dirección.
   */
  private buildLocationLink(admin: UserOrmEntity | null, adminDisplayName: string): LocationLinkResult {
    const lat = admin?.locationLat ?? null;
    const lng = admin?.locationLng ?? null;
    const address = admin?.locationAddress?.trim() ?? '';
    const hasCoords =
      lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    const hasAddress = address.length > 0;

    const publicBase = this.config.get<string>('MAIL_PUBLIC_BASE_URL', '')?.trim().replace(/\/$/, '') ?? '';

    if (publicBase) {
      const q = new URLSearchParams();
      q.set('emergency', '1');
      q.set('owner', adminDisplayName);
      if (hasCoords) {
        q.set('lat', String(lat));
        q.set('lng', String(lng));
      }
      if (hasAddress) {
        q.set('address', address);
      }
      const href = `${publicBase}/?${q.toString()}`;
      return {
        href,
        linkLabel: 'Ver la ubicación de mi hogar (mapa y dirección)',
        hasLocation: hasCoords || hasAddress,
      };
    }

    if (hasCoords) {
      const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
      return {
        href,
        linkLabel: 'Ver la ubicación en el mapa (OpenStreetMap)',
        hasLocation: true,
      };
    }

    if (hasAddress) {
      const href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
      return {
        href,
        linkLabel: 'Ver la dirección en el mapa (OpenStreetMap)',
        hasLocation: true,
      };
    }

    return { href: '', linkLabel: '', hasLocation: false };
  }

  /**
   * Emails destino: (1) tabla `contacts` / trusted_contacts y (2) usuarios rol AUTHORIZED del tab
   * Contactos (`owner_user_id` = admin), igual que `GET /users`.
   */
  private async collectRecipientEmails(ownerAdminId: string): Promise<string[]> {
    const raw = new Set<string>();

    try {
      const list = await this.contacts.findByAdmin(ownerAdminId);
      for (const c of list) {
        if (!c.isActive) continue;
        const e = c.email?.trim().toLowerCase();
        if (e && e.includes('@')) raw.add(e);
      }
    } catch (e) {
      this.logger.warn(
        `Correo: no se pudieron leer trusted_contacts: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    try {
      const authorizedRows = await this.users
        .createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('user.owner_user_id = :ownerId', { ownerId: ownerAdminId })
        .andWhere('role.name = :roleName', { roleName: 'AUTHORIZED' })
        .andWhere('user.is_active = :active', { active: true })
        .getMany();

      for (const u of authorizedRows) {
        const e = u.email?.trim().toLowerCase();
        if (e && e.includes('@')) raw.add(e);
      }
    } catch (e) {
      this.logger.warn(
        `Correo: no se pudieron leer usuarios AUTHORIZED: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return [...raw];
  }

  /**
   * @returns true si se envió al menos un correo; false si no hubo destinatarios, SMTP o envío desactivado, o falló sendMail.
   * No lanza salvo errores inesperados previos al envío.
   */
  async sendPersonDetectedAlert(payload: PersonDetectedMailPayload): Promise<boolean> {
    if (!this.isMailEnabled()) {
      return false;
    }

    const transport = this.getOrCreateTransport();
    if (!transport) {
      return false;
    }

    const recipients = await this.collectRecipientEmails(payload.ownerAdminId);

    if (recipients.length === 0) {
      this.logger.warn(
        'Correo persona detectada: ningún destinatario con email. ' +
          'Agregue contactos en el tab Contactos (usuarios autorizados) o registre emails en trusted_contacts.',
      );
      return false;
    }

    const fromEmail =
      this.config.get<string>('MAIL_FROM', '')?.trim() ||
      this.config.get<string>('MAIL_SMTP_USER', '')?.trim();
    if (!fromEmail) {
      this.logger.warn('Correo persona detectada: falta MAIL_FROM o MAIL_SMTP_USER');
      return false;
    }

    let admin: UserOrmEntity | null = null;
    try {
      admin = await this.users.findOne({ where: { id: payload.ownerAdminId } });
    } catch (e) {
      this.logger.warn(
        `Correo: no se pudo cargar el perfil del admin: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const adminName = admin?.fullName?.trim() || 'el administrador';
    const { href: locationHref, linkLabel, hasLocation } = this.buildLocationLink(admin, adminName);

    const fromName = this.config.get<string>('MAIL_FROM_NAME', 'SecureHome AI');
    const from = `"${fromName}" <${fromEmail}>`;

    const pct = (payload.personScore * 100).toFixed(1);
    const when = new Date().toISOString();
    const subject = `[SecureHome] Intrusos — ${adminName} pide ayuda`;

    const mainParagraph = `Hola, soy ${escapeHtml(adminName)} y hay intrusos en mi hogar; por favor, manda ayuda. Mi ubicación es:`;

    const locationBlock = hasLocation && locationHref
      ? `<p style="margin:1rem 0"><a href="${escapeHtml(locationHref)}" style="display:inline-block;padding:12px 20px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">${escapeHtml(linkLabel)}</a></p>`
      : `<p style="margin:1rem 0;color:#92400e"><strong>Ubicación no registrada.</strong> El administrador aún no guardó su dirección en el perfil de la aplicación. Por favor, contacta por otros medios.</p>`;

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#0f172a;max-width:36rem">
        <p style="font-size:1.05rem">${mainParagraph}</p>
        ${locationBlock}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.25rem 0" />
        <p style="font-size:0.8rem;color:#64748b"><strong>Detalle del sistema (persona detectada por cámara)</strong></p>
        <ul style="font-size:0.8rem;color:#475569">
          <li><strong>Cámara:</strong> ${escapeHtml(payload.cameraDisplayName)}</li>
          <li><strong>Confianza del modelo:</strong> ${pct}%</li>
          <li><strong>Hora (UTC):</strong> ${escapeHtml(when)}</li>
        </ul>
        <p style="font-size:0.75rem;color:#94a3b8">Mensaje automático — SecureHome AI</p>
      </div>
    `;

    let text = `Hola, soy ${adminName} y hay intrusos en mi hogar; por favor, manda ayuda. Mi ubicación es:\n\n`;
    if (hasLocation && locationHref) {
      text += `${linkLabel}: ${locationHref}\n\n`;
    } else {
      text += '(Ubicación no registrada en la aplicación.)\n\n';
    }
    text += `---\nCámara: ${payload.cameraDisplayName}. Confianza modelo: ${pct}%. UTC: ${when}`;

    const maxAttach = 900_000;
    const attachments =
      payload.captureBuffer &&
      payload.captureBuffer.length > 0 &&
      payload.captureBuffer.length <= maxAttach
        ? [
            {
              filename: 'captura-deteccion.jpg',
              content: payload.captureBuffer,
              contentType: 'image/jpeg' as const,
            },
          ]
        : undefined;

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: recipients[0],
      subject,
      text,
      html,
      attachments,
    };
    if (recipients.length > 1) {
      mailOptions.bcc = recipients.slice(1);
    }

    try {
      await transport.sendMail(mailOptions);
      this.logger.log(`Correo de persona detectada enviado a ${recipients.length} destinatario(s)`);
      return true;
    } catch (e) {
      this.logger.error(
        `Fallo al enviar correo de alerta (persona): ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }
}
