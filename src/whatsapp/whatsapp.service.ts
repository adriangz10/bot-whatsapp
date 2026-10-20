import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppSendResponse {
  messaging_product: string;
  contacts?: { input: string; wa_id: string }[];
  messages?: { id: string }[];
}

type MediaType = 'image' | 'video' | 'document';

@Injectable()
export class WhatsAppService {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string = 'v22.0';

  constructor(private readonly configService: ConfigService) {
    this.accessToken =
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';

    if (!this.accessToken || !this.phoneNumberId) {
      console.warn(
        'WhatsApp credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env',
      );
    }
  }

  private getApiUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  private get authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  /** Envía un payload a la API de mensajes de WhatsApp y valida la respuesta. */
  private async postMessage(body: object): Promise<WhatsAppSendResponse> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    const response = await fetch(this.getApiUrl(), {
      method: 'POST',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as WhatsAppSendResponse;

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
    }

    return data;
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en_US',
  ): Promise<WhatsAppSendResponse> {
    return this.postMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    });
  }

  async getProfilePicture(phoneNumber: string): Promise<string | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumber}/whatsapp_business_profile`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.authHeaders,
      });

      const data = (await response.json()) as {
        profile_picture_url?: string;
      } | null;

      // The profile picture URL is in data.profile_picture_url
      // If using WhatsApp Business API with phone_number_id prefix:
      // https://graph.facebook.com/v22.0/{phone_number_id}/{phoneNumber}/profile_picture
      if (data?.profile_picture_url) {
        return data.profile_picture_url;
      }

      // Fallback: try the direct profile picture endpoint
      const fallbackUrl = `https://graph.facebook.com/${this.apiVersion}/${phoneNumber}/profile_picture`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'GET',
        headers: this.authHeaders,
      });

      const fallbackData = (await fallbackResponse.json()) as {
        data?: { url?: string };
        url?: string;
      } | null;
      return fallbackData?.data?.url || fallbackData?.url || null;
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      return null;
    }
  }

  async sendMessage(
    to: string,
    message: string,
  ): Promise<WhatsAppSendResponse> {
    return this.postMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: message,
      },
    });
  }

  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<WhatsAppSendResponse> {
    const mediaType = this.detectMediaType(mediaUrl);
    const media: { link: string; caption?: string } = { link: mediaUrl };

    if (caption) {
      media.caption = caption;
    }

    return this.postMessage({
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: media,
    });
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    if (!this.accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    // Obtener URL del archivo
    const url = `https://graph.facebook.com/${this.apiVersion}/${mediaId}`;
    const urlResponse = await fetch(url, {
      method: 'GET',
      headers: this.authHeaders,
    });

    const urlData = (await urlResponse.json()) as { url?: string } | null;
    const downloadUrl = urlData?.url;

    if (!downloadUrl) {
      throw new Error(
        `No se pudo obtener la URL del medio: ${JSON.stringify(urlData)}`,
      );
    }

    // Descargar el archivo
    const fileResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!fileResponse.ok) {
      throw new Error(`Error descargando medio: ${fileResponse.status}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private detectMediaType(url: string): MediaType {
    const extension =
      url.split('?')[0].split('#')[0].toLowerCase().split('.').pop() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExts = ['mp4', '3gp'];

    if (videoExts.includes(extension)) return 'video';
    if (imageExts.includes(extension)) return 'image';
    return 'document';
  }
}
