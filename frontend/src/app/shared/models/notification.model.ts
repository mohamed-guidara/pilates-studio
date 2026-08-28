export interface Notification {
  notificationId: number;
  clientId: number;
  subject: string;
  content: string;
  createdAt: string;
  isSeen: number; // 0 = unseen, 1 = seen
}