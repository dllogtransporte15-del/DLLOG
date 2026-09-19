export type WhatsAppConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'qrcode' 
  | 'connected' 
  | 'banned';

export type WhatsAppMessageType = 'text' | 'image' | 'document' | 'audio' | 'video';

export type WhatsAppQueueStatus = 
  | 'pending' 
  | 'processing' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed' 
  | 'cancelled';

export type WhatsAppAttachmentType = 
  | 'none' 
  | 'fixed_file' 
  | 'dynamic_cte' 
  | 'dynamic_contract' 
  | 'dynamic_voucher' 
  | 'custom_url';

export type WhatsAppTriggerEvent = 
  | 'shipment.created'          // Nova Carga / Embarque Criado
  | 'shipment.assigned'         // Motorista Atribuído à Carga
  | 'shipment.loading_order'    // Ordem de Carregamento Emitida
  | 'shipment.advance_paid'     // Comprovante de Adiantamento Pago
  | 'shipment.in_transit'       // Carga em Trânsito / Rastreamento
  | 'shipment.cte_emitted'      // CT-e Autorizado pela SEFAZ
  | 'shipment.delivered'        // Carga Descarregada / Comprovante Entregue
  | 'shipment.balance_paid'     // Saldo de Frete Quitado
  | 'risk.reproved'             // Aviso de Reprovação no Gerenciamento de Risco
  | 'custom.manual';            // Disparo Manual / Avulso

export interface WhatsAppInstance {
  id: string;
  name: string;
  instance_key: string;
  phone_number?: string;
  status: WhatsAppConnectionStatus;
  qr_code_base64?: string;
  battery_level?: number;
  is_plugged?: boolean;
  api_token: string;
  webhook_url?: string;
  last_connected_at?: string;
  last_disconnected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateTag {
  tag: string;
  label: string;
  example: string;
  description: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  trigger_event: WhatsAppTriggerEvent;
  description?: string;
  body_text: string;
  available_tags: WhatsAppTemplateTag[];
  attachment_type: WhatsAppAttachmentType;
  fixed_attachment_url?: string;
  default_filename?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppQueueItem {
  id: string;
  instance_id?: string;
  template_id?: string;
  shipment_id?: string;
  recipient_phone: string;
  recipient_name?: string;
  message_type: WhatsAppMessageType;
  rendered_body: string;
  media_url?: string;
  media_filename?: string;
  media_caption?: string;
  status: WhatsAppQueueStatus;
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  sent_at?: string;
  error_message?: string;
  external_message_id?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageLog {
  id: string;
  queue_id: string;
  event_type: 'enqueued' | 'dispatch_attempt' | 'ack_delivery' | 'ack_read' | 'failed' | 'retry';
  payload?: any;
  created_at: string;
}
