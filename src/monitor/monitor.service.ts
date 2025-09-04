import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MonitorService {
  constructor(private readonly httpService: HttpService) {}
  async checkAndTrigger() {
    try {
      // 调用监听接口
      const response = await firstValueFrom(
        this.httpService.get(
        'https://bbplanet.bilibili.co/api/planet/comment/commentList?articleBusinessId=ef2eec1492fc46edbeb44dade7084678&pageSize=50&pageNum=1&order=1&scrollId=null',
      ));

      // 检查数据是否符合条件
      // if (response.data.someField === 'expectedValue') {
      //   // 调用上传接口
      //   await firstValueFrom(
      //     this.httpService.post('https://api.example.com/upload', {
      //       message: 'Condition met!',
      //       data: response.data
      //     })
      //   );
      // }
      console.log(response.data);
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }
}
