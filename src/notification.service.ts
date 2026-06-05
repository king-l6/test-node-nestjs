import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // WxPusher 配置，注册 https://wxpusher.zjiecode.com 获取
  private readonly appToken = 'AT_JdSTC8GqWjmVchqxAfMqGpZIepQryDXZ';
  private readonly uid = 'UID_yHKAwfr1RUI3yJq8uQFaagGOuzas';

  async send(title: string, content: string) {
    if (!this.appToken || !this.uid) {
      this.logger.warn('WxPusher 未配置，跳过通知');
      return;
    }

    try {
      const response = await fetch(
        'https://wxpusher.zjiecode.com/api/send/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appToken: this.appToken,
            content: `<h3>${title}</h3><p>${content}</p>`,
            summary: title,
            contentType: 2,
            uids: [this.uid],
          }),
        },
      );

      const result = await response.json();
      if (result.code === 1000) {
        this.logger.log('WxPusher 通知发送成功');
      } else {
        this.logger.warn(`WxPusher 通知失败: ${result.msg}`);
      }
    } catch (error) {
      this.logger.error('WxPusher 通知发送异常:', error.message);
    }
  }
}
