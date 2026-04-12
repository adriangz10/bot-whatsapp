export class SendTemplateDto {
  to: string;
  templateName: string;
  languageCode?: string;
}

export class SendMessageDto {
  to: string;
  message: string;
}