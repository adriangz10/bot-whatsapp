import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string = 'v22.0';

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';

    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('WhatsApp credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env');
    }
  }

  private getApiUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'en_US'): Promise<any> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    };

    const response = await fetch(this.getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
    }

    return data;
  }

  async getProfilePicture(phoneNumber: string): Promise<string | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumber}/whatsapp_business_profile`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();

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
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const fallbackData = await fallbackResponse.json();
      return fallbackData?.data?.url || fallbackData?.url || null;
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      return null;
    }
  }

  async sendMessage(to: string, message: string): Promise<any> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: message,
      },
    };

    const response = await fetch(this.getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
    }

    return data;
  }
}