export interface Notification {
  notificationId: number;
  clientId: number;
  subject: string;
  content: string;
  createdAt: string;
  isSeen: number
}
